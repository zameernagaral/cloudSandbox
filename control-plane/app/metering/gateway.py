"""
LLM Metering Gateway — ASGI proxy app using SQLite store and in-memory Redis.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import AsyncIterator

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.db import store
from app.db.models import Policy, SandboxState
from app.db.redis_client import (
    get_redis,
    loop_detection_key,
    sandbox_meters_key,
    sandbox_rpm_key,
    sandbox_tpm_key,
)
from app.services.crypto import decrypt

settings = get_settings()
metering_app = FastAPI(title="LLM Metering Gateway", docs_url=None)

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
    sandbox = store.get_sandbox(sandbox_id)
    if not sandbox:
        raise HTTPException(404, "Sandbox not found")
    if sandbox.state != SandboxState.RUNNING:
        raise HTTPException(403, "Sandbox is not running")

    policy = store.get_policy(sandbox.policy_id) if sandbox.policy_id else None
    creds = store.list_llm_credentials(sandbox.owner_id)
    if not creds:
        raise HTTPException(403, "No LLM credentials configured. Add them in Settings.")
    cred = creds[0]
    raw_key = decrypt(cred.encrypted_key)
    return policy, cred.provider, raw_key


async def _check_and_update_meters(
    sandbox_id: str, policy: Policy | None, input_tokens: int, output_tokens: int, model: str
) -> None:
    redis = await get_redis()
    cost = _estimate_cost(model, input_tokens, output_tokens)
    total_tokens = input_tokens + output_tokens
    now = time.time()

    pipe = redis.pipeline()
    meters_key = sandbox_meters_key(sandbox_id)
    pipe.hincrbyfloat(meters_key, "cost_usd", cost)
    pipe.hincrby(meters_key, "tokens", total_tokens)
    pipe.hincrby(meters_key, "requests", 1)

    tpm_key = sandbox_tpm_key(sandbox_id)
    rpm_key = sandbox_rpm_key(sandbox_id)
    minute_ago = now - 60
    pipe.zadd(tpm_key, {f"{now}:{total_tokens}": now})
    pipe.zremrangebyscore(tpm_key, 0, minute_ago)
    pipe.zadd(rpm_key, {str(now): now})
    pipe.zremrangebyscore(rpm_key, 0, minute_ago)
    pipe.expire(tpm_key, 120)
    pipe.expire(rpm_key, 120)
    await pipe.execute()

    if policy:
        meters = await redis.hgetall(meters_key)
        current_cost = float(meters.get("cost_usd", 0))
        current_tokens = int(float(meters.get("tokens", 0)))

        if policy.max_cost_usd and current_cost >= policy.max_cost_usd:
            await _trigger_killswitch(sandbox_id, "max_cost_usd", current_cost)
            raise HTTPException(402, f"Cost cap ${policy.max_cost_usd:.4f} reached. Sandbox frozen.")

        if policy.max_tokens and current_tokens >= policy.max_tokens:
            await _trigger_killswitch(sandbox_id, "max_tokens", current_tokens)
            raise HTTPException(402, f"Token cap {policy.max_tokens} reached. Sandbox frozen.")


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
    hashes = [e.split(":", 1)[1] for e in entries if ":" in e]
    identical = sum(1 for h in hashes if h == request_hash)
    if identical >= policy.loop_detection_n:
        await _trigger_killswitch(sandbox_id, "loop_detection", identical)
        raise HTTPException(402, "Loop detected. Sandbox frozen.")


async def _trigger_killswitch(sandbox_id: str, reason: str, metric_value: float) -> None:
    redis = await get_redis()
    await redis.xadd(
        "killswitch:trips",
        {"sandbox_id": sandbox_id, "reason": reason, "metric_value": str(metric_value)},
    )


@metering_app.api_route("/openai/{path:path}", methods=["GET", "POST", "DELETE", "PUT", "PATCH"])
async def proxy_openai(request: Request, path: str, x_sandbox_id: str = Header(...)) -> StreamingResponse:
    sandbox_id = x_sandbox_id
    policy, _provider, api_key = await _get_policy_and_key(sandbox_id)
    body_bytes = await request.body()
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
                accumulated = b""
                async for chunk in resp.aiter_bytes():
                    accumulated += chunk
                    yield chunk
                try:
                    data = json.loads(accumulated)
                    usage = data.get("usage", {})
                    await _check_and_update_meters(
                        sandbox_id,
                        policy,
                        usage.get("prompt_tokens", 0),
                        usage.get("completion_tokens", 0),
                        data.get("model", "gpt-4o"),
                    )
                except Exception:
                    pass

    return StreamingResponse(stream_response(), media_type="application/json")
