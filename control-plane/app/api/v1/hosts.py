"""Host registration and management endpoints."""

from __future__ import annotations

import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import Host, User
from app.middleware.auth import get_current_user
from app.schemas.sandbox import HostCreate, HostOut, HostRegisterRequest, HostRegisterResponse

router = APIRouter(prefix="/hosts", tags=["hosts"])


@router.get("", response_model=list[HostOut])
async def list_hosts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Host]:
    result = await db.execute(select(Host).where(Host.owner_id == current_user.id))
    return list(result.scalars().all())


@router.post("", response_model=HostRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_host(
    body: HostRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HostRegisterResponse:
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    host = Host(
        owner_id=current_user.id,
        name=body.name,
        agent_url=body.agent_url,
        token_hash=token_hash,
        total_vcpu=body.total_vcpu,
        total_ram_mb=body.total_ram_mb,
        total_disk_gb=body.total_disk_gb,
        firecracker_version=body.firecracker_version,
    )
    db.add(host)
    await db.flush()
    return HostRegisterResponse(host_id=host.id, token=raw_token)


@router.delete("/{host_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_host(
    host_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Host).where(Host.id == host_id, Host.owner_id == current_user.id)
    )
    host = result.scalar_one_or_none()
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    host.is_active = False
