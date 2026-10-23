"""
LLM Metering Gateway — ASGI proxy app that:
  1. Receives requests from inside the microVM (via host-side HTTP listener)
  2. Injects the user's encrypted API key (never sent to the VM)
  3. Counts tokens and estimated cost per sandbox in Redis
  4. Enforces rate limits (max_tokens_per_minute, max_requests_per_minute)
  5. Detects loop patterns (N near-identical requests in window)

Supported providers: OpenAI-compatible, Anthropic

The proxy runs as a separate FastAPI app on METERING_GATEWAY_PORT.
The Firecracker VM's egress is nftables-filtered to only reach this port on the host.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import AsyncIterator

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.config import get_settings
from app.db.base import AsyncSessionLocal
from app.db.models import LLMCredential, Policy, Sandbox, SandboxState
from app.db.redis_client import (
    get_redis,
    loop_detection_key,
    sandbox_meters_key,
    sandbox_rpm_key,
    sandbox_state_key,
    sandbox_tpm_key,
)
from app.services.crypto import decrypt

settings = get_settings()

metering_app = FastAPI(title="LLM Metering Gateway", docs_url=None)

# Pricing per 1M tokens (approximate, update as providers change)
PRICING: dict[str, dict[str, float]] = {
    "gpt-4o": {"input": 5.0, "output": 15.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4-turbo": {"input": 10.0, "output": 30.0},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    "claude-3-5-sonnet": {"input": 3.0, "output": 15.0},
    "claude-3-5-haiku": {"input": 0.80, "output": 4.0},
    "claude-3-opus": {"input": 15.0, "output": 75.0},
}
DEFAULT_PRICING = {"input": 5.0, "output": 15.0}


def _estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    pricing = next((v for k, v in PRICING.items() if k in model), DEFAULT_PRICING)
    return (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000


async def _get_policy_and_key(sandbox_id: str) -> tuple[Policy | None, str, str]:
    """Returns (policy, provider, raw_api_key)."""
    async with AsyncSessionLocal() as db:
        sb_result = await db.execute(select(Sandbox).where(Sandbox.id == sandbox_id))
        sandbox = sb_result.scalar_one_or_none()
        if not sandbox:
            raise HTTPException(404, "Sandbox not found")
        if sandbox.state != SandboxState.RUNNING:
            raise HTTPException(403, "Sandbox is not running")

        policy = None
        if sandbox.policy_id:
            p_result = await db.execute(select(Policy).where(Policy.id == sandbox.policy_id))
            policy = p_result.scalar_one_or_none()

        # Get LLM key for the sandbox owner
        cred_result = await db.execute(
            select(LLMCredential).where(LLMCredential.user_id == sandbox.owner_id)
        )
        creds = cred_result.scalars().all()
        if not creds:
            raise HTTPException(403, "No LLM credentials configured. Add them in Settings.")
        # Pick first available; real impl would pick by provider
        cred = creds[0]
        raw_key = decrypt(cred.encrypted_key)
        return policy, cred.provider, raw_key


async def _check_and_update_meters(
    sandbox_id: str, policy: Policy | None, input_tokens: int, output_tokens: int, model: str
) -> None:
    """Update meters and enforce limits. Raises HTTPException if limit exceeded."""
    redis = await get_redis()
    cost = _estimate_cost(model, input_tokens, output_tokens)
    total_tokens = input_tokens + output_tokens
    now = time.time()

    # Update cumulative meters
    pipe = redis.pipeline()
    meters_key = sandbox_meters_key(sandbox_id)
    pipe.hincrbyfloat(meters_key, "cost_usd", cost)
    pipe.hincrby(meters_key, "tokens", total_tokens)
    pipe.hincrby(meters_key, "requests", 1)

    # Sliding-window TPM: sorted set of timestamps weighted by tokens
    tpm_key = sandbox_tpm_key(sandbox_id)
    rpm_key = sandbox_rpm_key(sandbox_id)
    minute_ago = now - 60
    pipe.zadd(tpm_key, {f"{now}:{total_tokens}": now})
    pipe.zremrangebyscore(tpm_key, 0, minute_ago)
    pipe.zadd(rpm_key, {str(now): now})
    pipe.zremrangebyscore(rpm_key, 0, minute_ago)
    pipe.expire(tpm_key, 120)
    pipe.expire(rpm_key, 120)
    results = await pipe.execute()

    if policy:
        # Get current totals for limit checks
        meters = await redis.hgetall(meters_key)
        current_cost = float(meters.get("cost_usd", 0))
        current_tokens = int(meters.get("tokens", 0))

        if policy.max_cost_usd and current_cost >= policy.max_cost_usd:
            await _trigger_killswitch(sandbox_id, "max_cost_usd", current_cost)
            raise HTTPException(402, f"Cost cap ${policy.max_cost_usd:.4f} reached. Sandbox frozen.")

        if policy.max_tokens and current_tokens >= policy.max_tokens:
            await _trigger_killswitch(sandbox_id, "max_tokens", current_tokens)
            raise HTTPException(402, f"Token cap {policy.max_tokens} reached. Sandbox frozen.")

        if policy.max_requests_per_minute:
            rpm = await redis.zcard(rpm_key)
            if rpm > policy.max_requests_per_minute:
                raise HTTPException(429, "Requests-per-minute limit exceeded")

        if policy.max_tokens_per_minute:
            tpm_entries = await redis.zrangebyscore(tpm_key, minute_ago, now)
            tpm = sum(int(e.split(":")[1]) for e in tpm_entries if ":" in e)
            if tpm > policy.max_tokens_per_minute:
                raise HTTPException(429, "Tokens-per-minute limit exceeded")


async def _check_loop_detection(sandbox_id: str, request_hash: str, policy: Policy | None) -> None:
    if not policy or policy.loop_detection_n < 2:
        return
    redis = await get_redis()
    key = loop_detection_key(sandbox_id)
    now = time.time()
    window = policy.loop_detection_window_s
    await redis.zadd(key, {f"{now}:{request_hash}": now})
    await redis.zremrangebyscore(key, 0, now - window)
    entries = await redis.zrangebyscore(key, now - window, now)
    # Count near-identical hashes
    hashes = [e.split(":", 1)[1] for e in entries if ":" in e]
    identical = sum(1 for h in hashes if h == request_hash)
    if identical >= policy.loop_detection_n:
        await _trigger_killswitch(sandbox_id, "loop_detection", identical)
        raise HTTPException(402, "Loop detected. Sandbox frozen.")


async def _trigger_killswitch(sandbox_id: str, reason: str, metric_value: float) -> None:
    """Signal the killswitch monitor (publishes to a Redis stream)."""
    redis = await get_redis()
    await redis.xadd(
        "killswitch:trips",
        {"sandbox_id": sandbox_id, "reason": reason, "metric_value": str(metric_value)},
    )


@metering_app.api_route("/openai/{path:path}", methods=["GET", "POST", "DELETE", "PUT", "PATCH"])
async def proxy_openai(request: Request, path: str, x_sandbox_id: str = Header(...)) -> StreamingResponse:
    """Proxy requests to OpenAI API with metering."""
    sandbox_id = x_sandbox_id
    policy, _provider, api_key = await _get_policy_and_key(sandbox_id)

    body_bytes = await request.body()

    # Loop detection hash
    body_hash = hashlib.sha256(body_bytes).hexdigest()[:16]
    await _check_loop_detection(sandbox_id, body_hash, policy)

    headers = dict(request.headers)
    headers["Authorization"] = f"Bearer {api_key}"
    headers.pop("host", None)
    headers.pop("x-sandbox-id", None)

    target_url = f"{settings.openai_api_base}/{path}"

    async def stream_response() -> AsyncIterator[bytes]:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                request.method,
                target_url,
                content=body_bytes,
                headers=headers,
                params=dict(request.query_params),
                timeout=120,
            ) as resp:
                # Parse usage from response for metering
                input_tokens = 0
                output_tokens = 0
                model = "gpt-4o"
                accumulated = b""
                async for chunk in resp.aiter_bytes():
                    accumulated += chunk
                    yield chunk
                # After stream, parse usage
                try:
                    data = json.loads(accumulated)
                    usage = data.get("usage", {})
                    input_tokens = usage.get("prompt_tokens", 0)
                    output_tokens = usage.get("completion_tokens", 0)
                    model = data.get("model", model)
                    if body_bytes:
                        req_data = json.loads(body_bytes)
                        model = req_data.get("model", model)
                except Exception:
                    pass
                await _check_and_update_meters(sandbox_id, policy, input_tokens, output_tokens, model)

    return StreamingResponse(stream_response(), media_type="application/json")


@metering_app.api_route("/anthropic/{path:path}", methods=["GET", "POST"])
async def proxy_anthropic(request: Request, path: str, x_sandbox_id: str = Header(...)) -> StreamingResponse:
    """Proxy requests to Anthropic API with metering."""
    sandbox_id = x_sandbox_id
    policy, _provider, api_key = await _get_policy_and_key(sandbox_id)

    body_bytes = await request.body()
    body_hash = hashlib.sha256(body_bytes).hexdigest()[:16]
    await _check_loop_detection(sandbox_id, body_hash, policy)

    headers = dict(request.headers)
    headers["x-api-key"] = api_key
    headers["anthropic-version"] = "2023-06-01"
    headers.pop("host", None)
    headers.pop("x-sandbox-id", None)

    target_url = f"{settings.anthropic_api_base}/{path}"

    async def stream_response() -> AsyncIterator[bytes]:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                request.method,
                target_url,
                content=body_bytes,
                headers=headers,
                timeout=120,
            ) as resp:
                accumulated = b""
                async for chunk in resp.aiter_bytes():
                    accumulated += chunk
                    yield chunk
                try:
                    data = json.loads(accumulated)
                    usage = data.get("usage", {})
                    input_tokens = usage.get("input_tokens", 0)
                    output_tokens = usage.get("output_tokens", 0)
                    model = data.get("model", "claude-3-5-sonnet")
                    await _check_and_update_meters(sandbox_id, policy, input_tokens, output_tokens, model)
                except Exception:
                    pass

    return StreamingResponse(stream_response(), media_type="application/json")
