"""FastAPI dependency for authenticating requests via JWT or API key."""

from __future__ import annotations

import hashlib

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import ApiKey, User
from app.services.auth import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise exc

    token = credentials.credentials

    # Try API key first (prefixed with "sk-")
    if token.startswith("sk-"):
        key_hash = hashlib.sha256(token.encode()).hexdigest()
        result = await db.execute(
            select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)  # noqa: E712
        )
        api_key = result.scalar_one_or_none()
        if not api_key:
            raise exc
        user_result = await db.execute(select(User).where(User.id == api_key.user_id, User.is_active == True))  # noqa: E712
        user = user_result.scalar_one_or_none()
        if not user:
            raise exc
        # Update last_used (best-effort, no rollback if fails)
        from datetime import UTC, datetime
        api_key.last_used_at = datetime.now(UTC)
        return user

    # Otherwise try JWT
    try:
        user_id = decode_access_token(token)
    except JWTError:
        raise exc

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()
    if not user:
        raise exc
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return current_user
