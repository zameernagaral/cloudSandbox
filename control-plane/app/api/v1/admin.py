"""Admin endpoints: Cluster counts, user management, audit logs, and alert inbox."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import AuditEvent, Host, Policy, Sandbox, SandboxState, User
from app.middleware.auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ───────────────────────────────────────────────────────────────────


class AlertStatus(str, enum.Enum):
    NEW = "new"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"


class AdminOverview(BaseModel):
    total_users: int
    active_hosts: int
    total_sandboxes: int
    breached_sandboxes: int
    total_spend_usd: float


class AdminUserOut(BaseModel):
    id: str
    email: str
    display_name: str | None
    is_admin: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_admin: bool | None = None
    is_active: bool | None = None


class AuditLogOut(BaseModel):
    id: str
    sandbox_id: str | None
    user_id: str | None
    event_type: str
    payload: dict | None
    ip_address: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BreachAlertOut(BaseModel):
    id: str
    sandbox_id: str
    sandbox_name: str
    owner_email: str
    reason: str
    cost_usd: float
    status: AlertStatus
    created_at: datetime


class AlertStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: AlertStatus


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/overview", response_model=AdminOverview)
async def get_admin_overview(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminOverview:
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    host_count = (await db.execute(select(func.count(Host.id)).where(Host.is_active == True))).scalar() or 0  # noqa: E712
    sb_count = (await db.execute(select(func.count(Sandbox.id)))).scalar() or 0
    breached_count = (
        await db.execute(
            select(func.count(Sandbox.id)).where(Sandbox.state == SandboxState.FROZEN)
        )
    ).scalar() or 0
    total_spend = (await db.execute(select(func.coalesce(func.sum(Sandbox.total_cost_usd), 0.0)))).scalar() or 0.0

    return AdminOverview(
        total_users=user_count,
        active_hosts=host_count,
        total_sandboxes=sb_count,
        breached_sandboxes=breached_count,
        total_spend_usd=round(float(total_spend), 4),
    )


@router.get("/users", response_model=list[AdminUserOut])
async def list_admin_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    offset = (page - 1) * page_size
    result = await db.execute(select(User).order_by(User.created_at.desc()).offset(offset).limit(page_size))
    return list(result.scalars().all())


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user_status(
    user_id: str,
    body: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    if user_id == admin.id and body.is_admin is False:
        raise HTTPException(status_code=400, detail="Cannot revoke admin privileges from your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.is_admin is not None:
        user.is_admin = body.is_admin
    if body.is_active is not None:
        user.is_active = body.is_active

    return user


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AuditEvent]:
    offset = (page - 1) * page_size
    result = await db.execute(select(AuditEvent).order_by(AuditEvent.created_at.desc()).offset(offset).limit(page_size))
    return list(result.scalars().all())


@router.get("/alerts", response_model=list[BreachAlertOut])
async def list_alerts(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[BreachAlertOut]:
    """Retrieves containment breach alerts from frozen or error sandboxes."""
    result = await db.execute(
        select(Sandbox, User)
        .join(User, Sandbox.owner_id == User.id)
        .where(Sandbox.state.in_([SandboxState.FROZEN, SandboxState.ERROR]))
        .order_by(Sandbox.updated_at.desc() if hasattr(Sandbox, "updated_at") else Sandbox.created_at.desc())
        .limit(50)
    )
    alerts = []
    for sb, usr in result.all():
        alerts.append(
            BreachAlertOut(
                id=f"alert-{sb.id[:8]}",
                sandbox_id=sb.id,
                sandbox_name=sb.name,
                owner_email=usr.email,
                reason=sb.trip_reason or "Cost cap threshold tripped",
                cost_usd=sb.total_cost_usd,
                status=AlertStatus.NEW,
                created_at=sb.frozen_at or sb.created_at,
            )
        )
    return alerts

