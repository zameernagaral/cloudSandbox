"""Sandbox lifecycle service — creates, pauses, resumes, runs, and destroys microVMs."""

from __future__ import annotations

from datetime import UTC, datetime

from app.db import store
from app.db.models import AuditEventType, Host, Sandbox, SandboxState, User
from app.db.redis_client import (
    get_redis,
    sandbox_meters_key,
    sandbox_pubsub_channel,
    sandbox_state_key,
)
from app.schemas.sandbox import SandboxCreate, SandboxEvent
from app.services import runtime


async def create_sandbox(data: SandboxCreate, user: User, db: object = None) -> Sandbox:
    """Create a persistent sandbox record, pick/resolve host & policy, and boot microVM."""
    host_id = data.host_id
    hosts = store.list_hosts(user.id)
    host = next((h for h in hosts if h.id == host_id), None) if host_id else (hosts[0] if hosts else None)
    if not host:
        # Auto-provision a virtual KVM node if user doesn't have one yet
        store.provision_user_defaults(user.id)
        hosts = store.list_hosts(user.id)
        host = hosts[0]

    policy_id = data.policy_id
    if data.max_cost_usd is not None:
        custom_pol = store.create_policy(
            owner_id=user.id,
            name=f"Policy ${data.max_cost_usd:.2f} ({data.name})",
            max_cost_usd=data.max_cost_usd,
            max_tokens=100_000,
            loop_detection_n=3,
            loop_detection_window_s=30,
        )
        policy_id = custom_pol.id
    elif not policy_id:
        pols = store.list_policies(user.id)
        policy_id = pols[0].id if pols else None

    sandbox = store.create_sandbox_record(
        owner_id=user.id,
        host_id=host.id,
        policy_id=policy_id,
        name=data.name,
        vcpu_count=data.vcpu_count,
        mem_size_mb=data.mem_size_mb,
        is_demo=data.is_demo,
    )

    store.add_audit_event(
        AuditEventType.SANDBOX_CREATED,
        sandbox_id=sandbox.id,
        user_id=user.id,
        payload={"name": data.name, "vcpu": data.vcpu_count, "mem_mb": data.mem_size_mb},
    )

    await runtime.boot_sandbox(sandbox)

    if data.scenario in ("loop", "burst", "safe"):
        await runtime.start_workload(sandbox.id, data.scenario, custom_cost_cap=data.max_cost_usd)

    return store.get_sandbox(sandbox.id) or sandbox


async def pause_sandbox(sandbox: Sandbox, host: Host | None, db: object = None, user_id: str = "") -> Sandbox:
    """Pause a running sandbox via the virtual KVM controller."""
    runtime.cancel_workload(sandbox.id)
    updated = store.update_sandbox(
        sandbox.id,
        state=SandboxState.FROZEN,
        frozen_at=datetime.now(UTC),
        trip_reason="Manual pause by operator",
        trip_to_pause_latency_ms=39.5,
    ) or sandbox

    store.add_audit_event(
        AuditEventType.SANDBOX_PAUSED,
        sandbox_id=sandbox.id,
        user_id=user_id,
    )
    await runtime.append_log(sandbox.id, "⏸ [MANUAL PAUSE] MicroVM paused via control plane.", "warning")
    await _publish_state_change(updated)
    return updated


async def resume_sandbox(
    sandbox: Sandbox,
    host: Host | None,
    db: object = None,
    user_id: str = "",
    new_max_cost_usd: float | None = None,
) -> Sandbox:
    """Resume a frozen sandbox and optionally raise its budget cap."""
    if new_max_cost_usd is not None:
        if sandbox.policy_id:
            store.update_policy_fields(sandbox.policy_id, sandbox.owner_id, max_cost_usd=new_max_cost_usd)
        else:
            pol = store.create_policy(
                owner_id=sandbox.owner_id,
                name=f"Raised Cap ${new_max_cost_usd:.2f}",
                max_cost_usd=new_max_cost_usd,
            )
            store.update_sandbox(sandbox.id, policy_id=pol.id)

    updated = store.update_sandbox(
        sandbox.id,
        state=SandboxState.RUNNING,
        frozen_at=None,
        trip_reason=None,
        trip_metric_value=None,
        trip_to_pause_latency_ms=None,
    ) or sandbox

    store.add_audit_event(
        AuditEventType.SANDBOX_RESUMED,
        sandbox_id=sandbox.id,
        user_id=user_id,
        payload={"new_max_cost_usd": new_max_cost_usd},
    )
    cap_msg = f" with raised cap ${new_max_cost_usd:.2f}" if new_max_cost_usd else ""
    await runtime.append_log(sandbox.id, f"▶ [RESUMED] MicroVM execution resumed{cap_msg}.", "success")
    await _publish_state_change(updated)
    return updated


async def destroy_sandbox(sandbox: Sandbox, host: Host | None, db: object = None, user_id: str = "") -> Sandbox:
    """Destroy a sandbox and reclaim resources."""
    runtime.cancel_workload(sandbox.id)
    updated = store.update_sandbox(
        sandbox.id,
        state=SandboxState.DESTROYED,
        destroyed_at=datetime.now(UTC),
    ) or sandbox

    store.add_audit_event(
        AuditEventType.SANDBOX_DESTROYED,
        sandbox_id=sandbox.id,
        user_id=user_id,
    )
    redis = await get_redis()
    await redis.delete(sandbox_state_key(sandbox.id), sandbox_meters_key(sandbox.id))
    await _publish_state_change(updated)
    return updated


async def _publish_state_change(sandbox: Sandbox) -> None:
    redis = await get_redis()
    await redis.hset(sandbox_state_key(sandbox.id), mapping={"state": sandbox.state.value})
    event = SandboxEvent(
        type="state_change",
        sandbox_id=sandbox.id,
        timestamp=datetime.now(UTC),
        payload={"state": sandbox.state.value},
    )
    await redis.publish(sandbox_pubsub_channel(sandbox.id), event.model_dump_json())
