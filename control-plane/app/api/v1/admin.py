"""Admin endpoints: Cluster counts, user management, audit logs, and alert inbox."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from app.db import store
from app.db.models import AuditEvent, User
from app.middleware.auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


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


@router.get("/overview", response_model=AdminOverview)
async def get_admin_overview(
    _admin: User = Depends(require_admin),
) -> AdminOverview:
    return AdminOverview(**store.get_admin_overview_stats())


@router.get("/users", response_model=list[AdminUserOut])
async def list_admin_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    _admin: User = Depends(require_admin),
) -> list[User]:
    return store.list_users(page=page, page_size=page_size)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user_status(
    user_id: str,
    body: AdminUserUpdate,
    admin: User = Depends(require_admin),
) -> User:
    if user_id == admin.id and body.is_admin is False:
        raise HTTPException(
            status_code=400, detail="Cannot revoke admin privileges from your own account"
        )
    updated = store.update_user(user_id, is_admin=body.is_admin, is_active=body.is_active)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(require_admin),
) -> list[AuditEvent]:
    return store.list_audit_events(page=page, page_size=page_size)


@router.get("/alerts", response_model=list[BreachAlertOut])
async def list_alerts(
    _admin: User = Depends(require_admin),
) -> list[BreachAlertOut]:
    return [BreachAlertOut(**row) for row in store.get_admin_breach_alerts()]
