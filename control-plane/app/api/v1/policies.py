"""Policy CRUD endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import store
from app.db.models import Policy, User
from app.middleware.auth import get_current_user
from app.schemas.sandbox import PolicyCreate, PolicyOut, PolicyUpdate

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("", response_model=list[PolicyOut])
async def list_policies(
    current_user: User = Depends(get_current_user),
) -> list[Policy]:
    return store.list_policies(current_user.id)


@router.post("", response_model=PolicyOut, status_code=status.HTTP_201_CREATED)
async def create_policy(
    body: PolicyCreate,
    current_user: User = Depends(get_current_user),
) -> Policy:
    return store.create_policy(owner_id=current_user.id, **body.model_dump())


@router.get("/{policy_id}", response_model=PolicyOut)
async def get_policy(
    policy_id: str,
    current_user: User = Depends(get_current_user),
) -> Policy:
    pol = store.get_policy(policy_id)
    if not pol or pol.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Policy not found")
    return pol


@router.patch("/{policy_id}", response_model=PolicyOut)
async def update_policy(
    policy_id: str,
    body: PolicyUpdate,
    current_user: User = Depends(get_current_user),
) -> Policy:
    pol = store.update_policy_fields(
        policy_id, current_user.id, **body.model_dump(exclude_none=True)
    )
    if not pol:
        raise HTTPException(status_code=404, detail="Policy not found")
    return pol


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(
    policy_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    if not store.delete_policy(policy_id, current_user.id):
        raise HTTPException(status_code=404, detail="Policy not found")
