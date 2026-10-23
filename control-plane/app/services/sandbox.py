"""Sandbox lifecycle service — creates, pauses, resumes, and destroys microVMs."""

from __future__ import annotations

import json
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import (
    AuditEvent,
    AuditEventType,
    Host,
    KillswitchAction,
    Policy,
    Sandbox,
    SandboxState,
    User,
)
from app.db.redis_client import (
    get_redis,
    sandbox_meters_key,
    sandbox_pubsub_channel,
    sandbox_state_key,
)
from app.schemas.sandbox import SandboxCreate, SandboxEvent

settings = get_settings()


async def _host_client(host: Host) -> httpx.AsyncClient:
    """Build an authenticated HTTP client for the given host agent."""
    headers = {"Authorization": f"Bearer {settings.host_agent_token}"}
    return httpx.AsyncClient(
        base_url=host.agent_url.replace("ws://", "http://").replace("wss://", "https://"),
        headers=headers,
        timeout=30,
    )


async def create_sandbox(data: SandboxCreate, user: User, db: AsyncSession) -> Sandbox:
    """Create a sandbox record in DB and tell the host agent to spin up a microVM."""
    # Verify host ownership
    host_result = await db.execute(
        select(Host).where(Host.id == data.host_id, Host.owner_id == user.id, Host.is_active == True)  # noqa: E712
    )
    host = host_result.scalar_one_or_none()
    if not host:
        raise ValueError("Host not found or not accessible")

    sandbox = Sandbox(
        owner_id=user.id,
        host_id=data.host_id,
        policy_id=data.policy_id,
        name=data.name,
        vcpu_count=data.vcpu_count,
        mem_size_mb=data.mem_size_mb,
        is_demo=data.is_demo,
        state=SandboxState.CREATING,
    )
    db.add(sandbox)
    await db.flush()  # get the ID

    db.add(
        AuditEvent(
            sandbox_id=sandbox.id,
            user_id=user.id,
            event_type=AuditEventType.SANDBOX_CREATED,
            payload={"name": data.name, "vcpu": data.vcpu_count, "mem_mb": data.mem_size_mb},
        )
    )

    # Call host agent asynchronously (non-blocking)
    # The host agent will POST back to /internal/sandbox/{id}/started when ready
    try:
        async with await _host_client(host) as client:
            resp = await client.post(
                "/vm/create",
                json={
                    "sandbox_id": sandbox.id,
                    "vcpu_count": data.vcpu_count,
                    "mem_size_mb": data.mem_size_mb,
                    "callback_url": f"{settings.frontend_url.replace('5173', '8000')}/internal/sandbox/{sandbox.id}/started",
                },
            )
            resp.raise_for_status()
            result = resp.json()
            sandbox.vm_id = result.get("vm_id")
    except Exception as exc:
        sandbox.state = SandboxState.ERROR
        db.add(
            AuditEvent(
                sandbox_id=sandbox.id,
                user_id=user.id,
                event_type=AuditEventType.SANDBOX_CREATED,
                payload={"error": str(exc)},
            )
        )

    return sandbox


async def pause_sandbox(sandbox: Sandbox, host: Host, db: AsyncSession, user_id: str) -> Sandbox:
    """Send pause command to host agent and update state."""
    async with await _host_client(host) as client:
        resp = await client.patch(f"/vm/{sandbox.vm_id}/state", json={"state": "Paused"})
        resp.raise_for_status()

    sandbox.state = SandboxState.FROZEN
    sandbox.frozen_at = datetime.now(UTC)
    db.add(
        AuditEvent(
            sandbox_id=sandbox.id,
            user_id=user_id,
            event_type=AuditEventType.SANDBOX_PAUSED,
        )
    )
    await _publish_state_change(sandbox)
    return sandbox


async def resume_sandbox(sandbox: Sandbox, host: Host, db: AsyncSession, user_id: str) -> Sandbox:
    """Resume a frozen sandbox."""
    async with await _host_client(host) as client:
        resp = await client.patch(f"/vm/{sandbox.vm_id}/state", json={"state": "Resumed"})
        resp.raise_for_status()

    sandbox.state = SandboxState.RUNNING
    sandbox.frozen_at = None
    sandbox.trip_reason = None
    db.add(
        AuditEvent(
            sandbox_id=sandbox.id,
            user_id=user_id,
            event_type=AuditEventType.SANDBOX_RESUMED,
        )
    )
    await _publish_state_change(sandbox)
    return sandbox


async def destroy_sandbox(sandbox: Sandbox, host: Host, db: AsyncSession, user_id: str) -> Sandbox:
    """Destroy a sandbox — tell host agent then mark state DESTROYED."""
    try:
        async with await _host_client(host) as client:
            resp = await client.delete(f"/vm/{sandbox.vm_id}")
            resp.raise_for_status()
    except Exception:
        pass  # Destroy regardless of agent errors

    sandbox.state = SandboxState.DESTROYED
    sandbox.destroyed_at = datetime.now(UTC)
    db.add(
        AuditEvent(
            sandbox_id=sandbox.id,
            user_id=user_id,
            event_type=AuditEventType.SANDBOX_DESTROYED,
        )
    )
    # Clean up Redis meters
    redis = await get_redis()
    await redis.delete(sandbox_state_key(sandbox.id), sandbox_meters_key(sandbox.id))
    await _publish_state_change(sandbox)
    return sandbox


async def _publish_state_change(sandbox: Sandbox) -> None:
    """Push a state change event to the Redis pub/sub channel."""
    redis = await get_redis()
    event = SandboxEvent(
        type="state_change",
        sandbox_id=sandbox.id,
        timestamp=datetime.now(UTC),
        payload={"state": sandbox.state.value},
    )
    await redis.publish(sandbox_pubsub_channel(sandbox.id), event.model_dump_json())
