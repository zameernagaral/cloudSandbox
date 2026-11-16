"""Sandbox CRUD, lifecycle, workload execution, and interactive shell endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db import store
from app.db.models import Sandbox, SandboxState, User
from app.middleware.auth import get_current_user
from app.schemas.sandbox import (
    ExecCommandRequest,
    ResumeRequest,
    RunWorkloadRequest,
    SandboxCreate,
    SandboxOut,
)
from app.services import runtime
from app.services.quota import QuotaExceededError, check_sandbox_creation_quota
from app.services.sandbox import create_sandbox, destroy_sandbox, pause_sandbox, resume_sandbox

router = APIRouter(prefix="/sandboxes", tags=["sandboxes"])


def _get_sandbox_or_404(sandbox_id: str, user: User) -> Sandbox:
    sb = store.get_sandbox_for_user(sandbox_id, user.id)
    if not sb:
        raise HTTPException(status_code=404, detail="Sandbox not found")
    return sb


@router.get("", response_model=list[SandboxOut])
async def list_sandboxes(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
) -> list[Sandbox]:
    return store.list_sandboxes(current_user.id, page=page, page_size=page_size)


@router.post("", response_model=SandboxOut, status_code=status.HTTP_201_CREATED)
async def create(
    body: SandboxCreate,
    current_user: User = Depends(get_current_user),
) -> Sandbox:
    try:
        await check_sandbox_creation_quota(current_user)
    except QuotaExceededError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    return await create_sandbox(body, current_user)


@router.get("/{sandbox_id}", response_model=SandboxOut)
async def get_sandbox(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
) -> Sandbox:
    return _get_sandbox_or_404(sandbox_id, current_user)


@router.post("/{sandbox_id}/pause", response_model=SandboxOut)
async def pause(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
) -> Sandbox:
    sb = _get_sandbox_or_404(sandbox_id, current_user)
    if sb.state != SandboxState.RUNNING:
        raise HTTPException(status_code=400, detail="Sandbox is not running")
    host = store.get_host(sb.host_id) if sb.host_id else None
    return await pause_sandbox(sb, host, user_id=current_user.id)


@router.post("/{sandbox_id}/resume", response_model=SandboxOut)
async def resume(
    sandbox_id: str,
    body: ResumeRequest | None = None,
    current_user: User = Depends(get_current_user),
) -> Sandbox:
    sb = _get_sandbox_or_404(sandbox_id, current_user)
    if sb.state != SandboxState.FROZEN:
        raise HTTPException(status_code=400, detail="Sandbox is not frozen")
    host = store.get_host(sb.host_id) if sb.host_id else None
    new_cap = body.new_max_cost_usd if body else None
    return await resume_sandbox(sb, host, user_id=current_user.id, new_max_cost_usd=new_cap)


@router.post("/{sandbox_id}/run", response_model=SandboxOut)
async def run_workload(
    sandbox_id: str,
    body: RunWorkloadRequest,
    current_user: User = Depends(get_current_user),
) -> Sandbox:
    sb = _get_sandbox_or_404(sandbox_id, current_user)
    if sb.state == SandboxState.DESTROYED:
        raise HTTPException(status_code=400, detail="Sandbox is destroyed")
    if sb.state == SandboxState.FROZEN:
        # Automatically resume if user explicitly starts a new workload from STOPPED/FROZEN? Keep explicit: require running or auto-resume with current cap if reset.
        raise HTTPException(
            status_code=400,
            detail="Sandbox is FROZEN by killswitch. Raise the budget cap and resume it before running a new task.",
        )
    await runtime.start_workload(sb.id, scenario=body.scenario, custom_cost_cap=body.max_cost_usd)
    return store.get_sandbox(sb.id) or sb


@router.post("/{sandbox_id}/exec")
async def exec_in_sandbox(
    sandbox_id: str,
    body: ExecCommandRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    sb = _get_sandbox_or_404(sandbox_id, current_user)
    output = await runtime.exec_command(sb.id, body.command)
    return {
        "sandbox_id": sb.id,
        "output": output,
        "logs": runtime.get_logs(sb.id),
    }


@router.get("/{sandbox_id}/logs")
async def get_sandbox_logs(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    sb = _get_sandbox_or_404(sandbox_id, current_user)
    logs = runtime.get_logs(sb.id)
    meters = await runtime.get_live_meters(sb)
    policy = store.get_policy(sb.policy_id) if sb.policy_id else None
    return {
        "sandbox_id": sb.id,
        "sandbox": SandboxOut.model_validate(sb),
        "policy_max_cost_usd": policy.max_cost_usd if policy else 0.01,
        "meters": meters,
        "logs": logs,
    }


@router.delete("/{sandbox_id}", response_model=SandboxOut)
async def destroy(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
) -> Sandbox:
    sb = _get_sandbox_or_404(sandbox_id, current_user)
    if sb.state == SandboxState.DESTROYED:
        raise HTTPException(status_code=400, detail="Already destroyed")
    host = store.get_host(sb.host_id) if sb.host_id else None
    return await destroy_sandbox(sb, host, user_id=current_user.id)
