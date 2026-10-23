"""Internal endpoints called by the host agent (not exposed publicly)."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.base import get_db
from app.db.models import AuditEvent, AuditEventType, Host, Sandbox, SandboxState
from app.db.redis_client import get_redis, sandbox_pubsub_channel, sandbox_state_key
from app.schemas.sandbox import SandboxEvent

settings = get_settings()
router = APIRouter(prefix="/internal", tags=["internal"])


async def _verify_host_token(authorization: str = Header(...)) -> None:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or token != settings.host_agent_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid host token")


@router.post("/sandbox/{sandbox_id}/started")
async def sandbox_started(
    sandbox_id: str,
    vm_id: str,
    _auth: None = Depends(_verify_host_token),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Sandbox).where(Sandbox.id == sandbox_id))
    sandbox = result.scalar_one_or_none()
    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    sandbox.state = SandboxState.RUNNING
    sandbox.vm_id = vm_id
    sandbox.started_at = datetime.now(UTC)
    db.add(
        AuditEvent(
            sandbox_id=sandbox_id,
            event_type=AuditEventType.SANDBOX_STARTED,
            payload={"vm_id": vm_id},
        )
    )

    # Update Redis
    redis = await get_redis()
    await redis.hset(sandbox_state_key(sandbox_id), mapping={"state": "RUNNING", "vm_id": vm_id})
    event = SandboxEvent(
        type="state_change",
        sandbox_id=sandbox_id,
        timestamp=datetime.now(UTC),
        payload={"state": "RUNNING"},
    )
    await redis.publish(sandbox_pubsub_channel(sandbox_id), event.model_dump_json())
    return {"ok": True}


@router.post("/host/{host_id}/heartbeat")
async def host_heartbeat(
    host_id: str,
    _auth: None = Depends(_verify_host_token),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Host).where(Host.id == host_id))
    host = result.scalar_one_or_none()
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    host.last_heartbeat_at = datetime.now(UTC)
    return {"ok": True}


@router.post("/metrics/push")
async def push_metrics(
    sandbox_id: str,
    cpu_seconds: float,
    memory_mb: float,
    _auth: None = Depends(_verify_host_token),
) -> dict:
    """Receive cgroup metrics pushed by the host agent."""
    redis = await get_redis()
    await redis.hset(
        sandbox_state_key(sandbox_id),
        mapping={"cpu_seconds": cpu_seconds, "memory_mb": memory_mb},
    )
    return {"ok": True}
