"""Demo mode endpoint — launches a live rogue agent sandbox with a strict $0.01 cap."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import get_settings
from app.db import store
from app.db.models import KillswitchAction, User
from app.middleware.auth import get_current_user
from app.schemas.sandbox import SandboxCreate, SandboxOut
from app.services.quota import QuotaExceededError, check_sandbox_creation_quota
from app.services.sandbox import create_sandbox

router = APIRouter(prefix="/demo", tags=["demo"])
settings = get_settings()


@router.post("/launch", response_model=SandboxOut)
async def launch_demo(
    scenario: str = "loop",
    cost_cap_usd: float | None = None,
    current_user: User = Depends(get_current_user),
) -> SandboxOut:
    if not settings.demo_enabled:
        raise HTTPException(status_code=403, detail="Demo mode is disabled")

    hosts = store.list_hosts(current_user.id)
    if not hosts:
        store.provision_user_defaults(current_user.id)
        hosts = store.list_hosts(current_user.id)
    host = hosts[0]

    cap = cost_cap_usd if cost_cap_usd and cost_cap_usd > 0 else settings.demo_cost_cap_usd
    demo_policy = store.create_policy(
        owner_id=current_user.id,
        name=f"Demo Policy (${cap:.3f})",
        max_cost_usd=cap,
        max_tokens=10_000,
        loop_detection_n=3,
        loop_detection_window_s=30,
        action=KillswitchAction.PAUSE,
    )

    try:
        await check_sandbox_creation_quota(current_user)
    except QuotaExceededError as exc:
        raise HTTPException(status_code=429, detail=str(exc))

    sandbox_data = SandboxCreate(
        name=f"demo-{scenario}-agent",
        host_id=host.id,
        policy_id=demo_policy.id,
        vcpu_count=2,
        mem_size_mb=1024,
        is_demo=True,
        scenario=scenario if scenario in ("loop", "burst", "safe") else "loop",
        max_cost_usd=cap,
    )
    sb = await create_sandbox(sandbox_data, current_user)
    return SandboxOut.model_validate(sb)
