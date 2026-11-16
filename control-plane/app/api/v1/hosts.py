"""Host registration and management endpoints."""

from __future__ import annotations

import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import store
from app.db.models import AuditEventType, Host, User
from app.middleware.auth import require_admin
from app.schemas.sandbox import HostOut, HostRegisterRequest, HostRegisterResponse

router = APIRouter(prefix="/hosts", tags=["hosts"])


@router.get("", response_model=list[HostOut])
async def list_hosts(
    current_user: User = Depends(require_admin),
) -> list[Host]:
    return store.list_hosts(current_user.id)


@router.post("", response_model=HostRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_host(
    body: HostRegisterRequest,
    current_user: User = Depends(require_admin),
) -> HostRegisterResponse:
    raw_token = f"cs_host_{secrets.token_urlsafe(32)}"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    host = store.create_host(
        owner_id=current_user.id,
        name=body.name,
        agent_url=body.agent_url,
        token_hash=token_hash,
        total_vcpu=body.total_vcpu,
        total_ram_mb=body.total_ram_mb,
        total_disk_gb=body.total_disk_gb,
        firecracker_version=body.firecracker_version,
    )
    store.add_audit_event(
        AuditEventType.HOST_REGISTERED,
        user_id=current_user.id,
        payload={"host_id": host.id, "name": host.name},
    )
    return HostRegisterResponse(host_id=host.id, id=host.id, name=host.name, token=raw_token)


@router.delete("/{host_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_host(
    host_id: str,
    current_user: User = Depends(require_admin),
) -> None:
    if not store.deactivate_host(current_user.id, host_id):
        raise HTTPException(status_code=404, detail="Host not found")
