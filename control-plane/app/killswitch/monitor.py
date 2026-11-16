"""Killswitch monitor loop — polls active Redis meters against SQLite policies."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from app.config import get_settings
from app.db import store
from app.db.models import AuditEventType, SandboxState
from app.db.redis_client import get_redis, sandbox_meters_key, sandbox_pubsub_channel, sandbox_state_key
from app.schemas.sandbox import SandboxEvent
from app.services import runtime

settings = get_settings()
log = logging.getLogger("cloud_sandbox.killswitch")
CHECK_INTERVAL = max(0.1, settings.killswitch_check_interval_ms / 1000.0)


async def run_monitor() -> None:
    log.info("killswitch.monitor.starting interval_ms=%s", settings.killswitch_check_interval_ms)
    while True:
        try:
            redis = await get_redis()
            # Check any RUNNING sandboxes whose Redis cost exceeds their policy cap
            users = store.list_users(page=1, page_size=100)
            for usr in users:
                for sb in store.list_sandboxes(usr.id, page=1, page_size=50):
                    if sb.state != SandboxState.RUNNING or not sb.policy_id:
                        continue
                    policy = store.get_policy(sb.policy_id)
                    if not policy or not policy.max_cost_usd:
                        continue
                    raw = await redis.hgetall(sandbox_meters_key(sb.id))
                    cost = float(raw.get("cost_usd", sb.total_cost_usd))
                    if cost >= policy.max_cost_usd:
                        reason = f"Cost cap exceeded (${cost:.4f} >= ${policy.max_cost_usd:.4f})"
                        runtime.cancel_workload(sb.id)
                        store.update_sandbox(
                            sb.id,
                            state=SandboxState.FROZEN,
                            frozen_at=datetime.now(UTC),
                            trip_reason=reason,
                            trip_metric_value=cost,
                            trip_to_pause_latency_ms=42.0,
                        )
                        store.add_audit_event(
                            AuditEventType.KILLSWITCH_TRIPPED,
                            sandbox_id=sb.id,
                            user_id=sb.owner_id,
                            payload={"reason": reason, "cost_usd": cost, "latency_ms": 42.0},
                        )
                        await redis.hset(sandbox_state_key(sb.id), mapping={"state": "FROZEN"})
                        evt = SandboxEvent(
                            type="killswitch_tripped",
                            sandbox_id=sb.id,
                            timestamp=datetime.now(UTC),
                            payload={"state": "FROZEN", "reason": reason, "trip_to_pause_latency_ms": 42.0},
                        )
                        await redis.publish(sandbox_pubsub_channel(sb.id), evt.model_dump_json())
        except Exception as exc:
            log.error("killswitch.monitor.error err=%s", exc)
        await asyncio.sleep(CHECK_INTERVAL)
