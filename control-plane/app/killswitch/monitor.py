"""
Killswitch Monitor — async loop that runs every ≤100ms.

For every RUNNING sandbox, evaluates its policy limits against live Redis meters.
On trip: pauses the microVM via host agent, marks state FROZEN in Redis + Postgres,
pushes real-time event to UI, records trip_to_pause_latency_ms.

Also consumes the killswitch:trips Redis Stream produced by the metering gateway.
"""

from __future__ import annotations

import asyncio
import json
import time
from datetime import UTC, datetime

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.base import AsyncSessionLocal
from app.db.models import (
    AuditEvent,
    AuditEventType,
    Host,
    KillswitchAction,
    Policy,
    Sandbox,
    SandboxState,
)
from app.db.redis_client import (
    get_redis,
    sandbox_meters_key,
    sandbox_pubsub_channel,
    sandbox_state_key,
)
from app.schemas.sandbox import SandboxEvent

settings = get_settings()
log = structlog.get_logger(__name__)

CHECK_INTERVAL = settings.killswitch_check_interval_ms / 1000.0  # seconds


async def _get_meters(sandbox_id: str) -> dict[str, float]:
    redis = await get_redis()
    raw = await redis.hgetall(sandbox_meters_key(sandbox_id))
    return {k: float(v) for k, v in raw.items()} if raw else {}


async def _freeze_sandbox(sandbox: Sandbox, host: Host, reason: str, metric_value: float) -> float:
    """
    Freeze a microVM and return trip_to_pause_latency_ms.
    This is the hot path — target <1 second end-to-end.
    """
    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(
            base_url=host.agent_url.replace("ws://", "http://").replace("wss://", "https://"),
            headers={"Authorization": f"Bearer {settings.host_agent_token}"},
            timeout=5,
        ) as client:
            resp = await client.patch(f"/vm/{sandbox.vm_id}/state", json={"state": "Paused"})
            resp.raise_for_status()
    except Exception as exc:
        log.error("killswitch.pause_failed", sandbox_id=sandbox.id, error=str(exc))
        raise

    latency_ms = (time.perf_counter() - t0) * 1000
    log.info(
        "killswitch.tripped",
        sandbox_id=sandbox.id,
        reason=reason,
        metric_value=metric_value,
        latency_ms=latency_ms,
    )
    return latency_ms


async def _update_db_frozen(
    sandbox_id: str, reason: str, metric_value: float, latency_ms: float
) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Sandbox).where(Sandbox.id == sandbox_id))
        sandbox = result.scalar_one_or_none()
        if not sandbox:
            return
        sandbox.state = SandboxState.FROZEN
        sandbox.frozen_at = datetime.now(UTC)
        sandbox.trip_reason = reason
        sandbox.trip_metric_value = metric_value
        sandbox.trip_to_pause_latency_ms = latency_ms
        db.add(
            AuditEvent(
                sandbox_id=sandbox_id,
                event_type=AuditEventType.KILLSWITCH_TRIPPED,
                payload={
                    "reason": reason,
                    "metric_value": metric_value,
                    "latency_ms": latency_ms,
                },
            )
        )
        await db.commit()


async def _publish_frozen_event(sandbox_id: str, reason: str, latency_ms: float) -> None:
    redis = await get_redis()
    # Update Redis state
    await redis.hset(sandbox_state_key(sandbox_id), mapping={"state": "FROZEN"})
    event = SandboxEvent(
        type="killswitch_tripped",
        sandbox_id=sandbox_id,
        timestamp=datetime.now(UTC),
        payload={
            "state": "FROZEN",
            "reason": reason,
            "trip_to_pause_latency_ms": latency_ms,
        },
    )
    await redis.publish(sandbox_pubsub_channel(sandbox_id), event.model_dump_json())


async def _evaluate_sandbox(sandbox: Sandbox, policy: Policy, host: Host) -> bool:
    """
    Evaluate policy limits. Returns True if the killswitch was tripped.
    """
    meters = await _get_meters(sandbox.id)
    cost = meters.get("cost_usd", 0.0)
    tokens = int(meters.get("tokens", 0))
    now_ts = time.time()

    # Wallclock time
    wallclock_s = 0.0
    if sandbox.started_at:
        wallclock_s = (datetime.now(UTC) - sandbox.started_at.replace(tzinfo=UTC)).total_seconds()

    trip_reason: str | None = None
    metric_value: float = 0.0

    if policy.max_cost_usd and cost >= policy.max_cost_usd:
        trip_reason, metric_value = "max_cost_usd", cost
    elif policy.max_tokens and tokens >= policy.max_tokens:
        trip_reason, metric_value = "max_tokens", float(tokens)
    elif policy.max_wallclock_seconds and wallclock_s >= policy.max_wallclock_seconds:
        trip_reason, metric_value = "max_wallclock_seconds", wallclock_s

    if not trip_reason:
        return False

    try:
        latency_ms = await _freeze_sandbox(sandbox, host, trip_reason, metric_value)
    except Exception:
        return False

    # Fire-and-forget DB + Redis updates
    asyncio.create_task(_update_db_frozen(sandbox.id, trip_reason, metric_value, latency_ms))
    asyncio.create_task(_publish_frozen_event(sandbox.id, trip_reason, latency_ms))
    return True


async def _consume_killswitch_stream() -> None:
    """Consume killswitch:trips stream produced by the metering gateway."""
    redis = await get_redis()
    last_id = "0"
    while True:
        try:
            messages = await redis.xread({"killswitch:trips": last_id}, count=100, block=100)
            for _stream, entries in messages:
                for entry_id, fields in entries:
                    last_id = entry_id
                    sandbox_id = fields.get("sandbox_id")
                    reason = fields.get("reason", "unknown")
                    metric_value = float(fields.get("metric_value", 0))
                    if not sandbox_id:
                        continue
                    async with AsyncSessionLocal() as db:
                        sb_result = await db.execute(
                            select(Sandbox).where(
                                Sandbox.id == sandbox_id,
                                Sandbox.state == SandboxState.RUNNING,
                            )
                        )
                        sandbox = sb_result.scalar_one_or_none()
                        if not sandbox or not sandbox.host_id:
                            continue
                        host_result = await db.execute(select(Host).where(Host.id == sandbox.host_id))
                        host = host_result.scalar_one_or_none()
                        if not host:
                            continue
                    try:
                        latency_ms = await _freeze_sandbox(sandbox, host, reason, metric_value)
                        asyncio.create_task(_update_db_frozen(sandbox_id, reason, metric_value, latency_ms))
                        asyncio.create_task(_publish_frozen_event(sandbox_id, reason, latency_ms))
                    except Exception as exc:
                        log.error("killswitch.stream_trip_failed", sandbox_id=sandbox_id, error=str(exc))
        except Exception as exc:
            log.error("killswitch.stream_error", error=str(exc))
            await asyncio.sleep(1)


async def run_monitor() -> None:
    """
    Main killswitch monitor loop.
    Polls all RUNNING sandboxes every CHECK_INTERVAL seconds.
    Also runs stream consumer concurrently.
    """
    log.info("killswitch.monitor.starting", interval_ms=settings.killswitch_check_interval_ms)
    asyncio.create_task(_consume_killswitch_stream())

    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Sandbox, Policy, Host)
                    .join(Policy, Sandbox.policy_id == Policy.id, isouter=True)
                    .join(Host, Sandbox.host_id == Host.id, isouter=True)
                    .where(Sandbox.state == SandboxState.RUNNING)
                )
                rows = result.all()

            tasks = []
            for sandbox, policy, host in rows:
                if policy and host:
                    tasks.append(_evaluate_sandbox(sandbox, policy, host))

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

        except Exception as exc:
            log.error("killswitch.monitor.error", error=str(exc))

        await asyncio.sleep(CHECK_INTERVAL)
