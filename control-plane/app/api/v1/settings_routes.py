"""User settings: API keys, LLM credentials."""

from __future__ import annotations

import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import store
from app.db.models import ApiKey, AuditEventType, LLMCredential, User
from app.middleware.auth import get_current_user
from app.schemas.sandbox import ApiKeyCreate, ApiKeyCreated, ApiKeyOut, LLMCredentialOut, LLMCredentialSet
from app.services.crypto import encrypt

router = APIRouter(prefix="/settings", tags=["settings"])


# ── API Keys ──────────────────────────────────────────────────────────────────

@router.get("/api-keys", response_model=list[ApiKeyOut])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
) -> list[ApiKey]:
    return store.list_api_keys(current_user.id)


@router.post("/api-keys", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
) -> ApiKeyCreated:
    raw_key = f"sk-{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:12]
    api_key = store.create_api_key(current_user.id, body.name, key_hash, key_prefix)
    store.add_audit_event(AuditEventType.API_KEY_SET, user_id=current_user.id, payload={"name": body.name})
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
) -> None:
    if not store.revoke_api_key(current_user.id, key_id):
        raise HTTPException(status_code=404, detail="API key not found")


# ── LLM Credentials ───────────────────────────────────────────────────────────

@router.get("/llm-credentials", response_model=list[LLMCredentialOut])
async def list_llm_credentials(
    current_user: User = Depends(get_current_user),
) -> list[LLMCredential]:
    return store.list_llm_credentials(current_user.id)


@router.put("/llm-credentials", response_model=LLMCredentialOut)
async def upsert_llm_credential(
    body: LLMCredentialSet,
    current_user: User = Depends(get_current_user),
) -> LLMCredential:
    encrypted = encrypt(body.api_key)
    cred = store.upsert_llm_credential(current_user.id, body.provider, encrypted)
    store.add_audit_event(
        AuditEventType.API_KEY_SET,
        user_id=current_user.id,
        payload={"provider": body.provider},
    )
    return cred


@router.delete("/llm-credentials/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_llm_credential(
    provider: str,
    current_user: User = Depends(get_current_user),
) -> None:
    if not store.delete_llm_credential(current_user.id, provider):
        raise HTTPException(status_code=404, detail="Credential not found")
