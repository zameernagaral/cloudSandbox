"""Sandbox CRUD and lifecycle endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import Host, Sandbox, SandboxState, User
from app.middleware.auth import get_current_user
from app.schemas.sandbox import ResumeRequest, SandboxCreate, SandboxOut
from app.services.quota import QuotaExceededError, check_sandbox_creation_quota
from app.services.sandbox import create_sandbox, destroy_sandbox, pause_sandbox, resume_sandbox

router = APIRouter(prefix="/sandboxes", tags=["sandboxes"])


async def _get_sandbox_or_404(sandbox_id: str, user: User, db: AsyncSession) -> Sandbox:
    result = await db.execute(
        select(Sandbox).where(Sandbox.id == sandbox_id, Sandbox.owner_id == user.id)
    )
    sb = result.scalar_one_or_none()
    if not sb:
        raise HTTPException(status_code=404, detail="Sandbox not found")
    return sb


async def _get_host_or_error(host_id: str | None, db: AsyncSession) -> Host:
    if not host_id:
        raise HTTPException(status_code=400, detail="Sandbox has no host")
    result = await db.execute(select(Host).where(Host.id == host_id))
    host = result.scalar_one_or_none()
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    return host


@router.get("", response_model=list[SandboxOut])
async def list_sandboxes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Sandbox]:
    result = await db.execute(
        select(Sandbox)
        .where(Sandbox.owner_id == current_user.id, Sandbox.state != SandboxState.DESTROYED)
        .order_by(Sandbox.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=SandboxOut, status_code=status.HTTP_201_CREATED)
async def create(
    body: SandboxCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Sandbox:
    try:
        await check_sandbox_creation_quota(current_user, db)
    except QuotaExceededError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    return await create_sandbox(body, current_user, db)


@router.get("/{sandbox_id}", response_model=SandboxOut)
async def get_sandbox(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Sandbox:
    return await _get_sandbox_or_404(sandbox_id, current_user, db)


@router.post("/{sandbox_id}/pause", response_model=SandboxOut)
async def pause(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Sandbox:
    sb = await _get_sandbox_or_404(sandbox_id, current_user, db)
    if sb.state != SandboxState.RUNNING:
        raise HTTPException(status_code=400, detail="Sandbox is not running")
    host = await _get_host_or_error(sb.host_id, db)
    return await pause_sandbox(sb, host, db, current_user.id)


@router.post("/{sandbox_id}/resume", response_model=SandboxOut)
async def resume(
    sandbox_id: str,
    body: ResumeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Sandbox:
    sb = await _get_sandbox_or_404(sandbox_id, current_user, db)
    if sb.state != SandboxState.FROZEN:
        raise HTTPException(status_code=400, detail="Sandbox is not frozen")
    host = await _get_host_or_error(sb.host_id, db)

    # Optionally raise the policy cap before resuming
    if body.new_max_cost_usd is not None and sb.policy_id:
        from sqlalchemy import select as sa_select
        from app.db.models import Policy
        policy_result = await db.execute(sa_select(Policy).where(Policy.id == sb.policy_id))
        policy = policy_result.scalar_one_or_none()
        if policy:
            policy.max_cost_usd = body.new_max_cost_usd

    return await resume_sandbox(sb, host, db, current_user.id)


@router.delete("/{sandbox_id}", response_model=SandboxOut)
async def destroy(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Sandbox:
    sb = await _get_sandbox_or_404(sandbox_id, current_user, db)
    if sb.state == SandboxState.DESTROYED:
        raise HTTPException(status_code=400, detail="Already destroyed")
    host = await _get_host_or_error(sb.host_id, db)
    return await destroy_sandbox(sb, host, db, current_user.id)
