"""User settings: API keys, LLM credentials."""

from __future__ import annotations

import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import ApiKey, LLMCredential, User
from app.middleware.auth import get_current_user
from app.schemas.sandbox import ApiKeyCreate, ApiKeyCreated, ApiKeyOut, LLMCredentialOut, LLMCredentialSet
from app.services.crypto import decrypt, encrypt

router = APIRouter(prefix="/settings", tags=["settings"])


# ── API Keys ──────────────────────────────────────────────────────────────────

@router.get("/api-keys", response_model=list[ApiKeyOut])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ApiKey]:
    result = await db.execute(
        select(ApiKey).where(ApiKey.user_id == current_user.id, ApiKey.is_active == True)  # noqa: E712
    )
    return list(result.scalars().all())


@router.post("/api-keys", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiKeyCreated:
    raw_key = f"sk-{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:12]
    api_key = ApiKey(
        user_id=current_user.id,
        name=body.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
    )
    db.add(api_key)
    await db.flush()
    return ApiKeyCreated(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        is_active=api_key.is_active,
        last_used_at=api_key.last_used_at,
        created_at=api_key.created_at,
        raw_key=raw_key,
    )


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False


# ── LLM Credentials ───────────────────────────────────────────────────────────

@router.get("/llm-credentials", response_model=list[LLMCredentialOut])
async def list_llm_credentials(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[LLMCredential]:
    result = await db.execute(
        select(LLMCredential).where(LLMCredential.user_id == current_user.id)
    )
    return list(result.scalars().all())


@router.put("/llm-credentials", response_model=LLMCredentialOut)
async def upsert_llm_credential(
    body: LLMCredentialSet,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LLMCredential:
    result = await db.execute(
        select(LLMCredential).where(
            LLMCredential.user_id == current_user.id,
            LLMCredential.provider == body.provider,
        )
    )
    cred = result.scalar_one_or_none()
    encrypted = encrypt(body.api_key)
    if cred:
        cred.encrypted_key = encrypted
    else:
        cred = LLMCredential(
            user_id=current_user.id,
            provider=body.provider,
            encrypted_key=encrypted,
        )
        db.add(cred)
    await db.flush()
    return cred


@router.delete("/llm-credentials/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_llm_credential(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(LLMCredential).where(
            LLMCredential.user_id == current_user.id,
            LLMCredential.provider == provider,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    await db.delete(cred)
