"""Demo mode endpoint — one click launches a rogue agent in a pre-configured microVM."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.base import get_db
from app.db.models import Host, KillswitchAction, Policy, User
from app.middleware.auth import get_current_user
from app.schemas.sandbox import SandboxCreate, SandboxOut
from app.services.quota import QuotaExceededError, check_sandbox_creation_quota
from app.services.sandbox import create_sandbox

router = APIRouter(prefix="/demo", tags=["demo"])
settings = get_settings()


@router.post("/launch", response_model=SandboxOut)
async def launch_demo(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SandboxOut:
    """Launch a demo sandbox with a rogue agent and a $0.01 cost cap."""
    if not settings.demo_enabled:
        raise HTTPException(status_code=403, detail="Demo mode is disabled")

    # Get user's first available host
    host_result = await db.execute(
        select(Host).where(Host.owner_id == current_user.id, Host.is_active == True).limit(1)  # noqa: E712
    )
    host = host_result.scalar_one_or_none()
    if not host:
        raise HTTPException(
            status_code=400,
            detail="No hosts registered. Run `sandboxctl host init` first.",
        )

    # Create a demo policy
    demo_policy = Policy(
        name="Demo Policy",
        owner_id=current_user.id,
        max_cost_usd=settings.demo_cost_cap_usd,
        max_tokens=10_000,
        loop_detection_n=3,
        loop_detection_window_s=30,
        action=KillswitchAction.PAUSE,
    )
    db.add(demo_policy)
    await db.flush()

    try:
        await check_sandbox_creation_quota(current_user, db)
    except QuotaExceededError as exc:
        raise HTTPException(status_code=429, detail=str(exc))

    sandbox_data = SandboxCreate(
        name=f"demo-{current_user.id[:8]}",
        host_id=host.id,
        policy_id=demo_policy.id,
        vcpu_count=1,
        mem_size_mb=256,
        is_demo=True,
    )
    return await create_sandbox(sandbox_data, current_user, db)
