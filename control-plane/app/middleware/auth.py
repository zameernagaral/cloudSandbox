"""FastAPI dependency for authenticating requests via JWT or API key."""

from __future__ import annotations

import hashlib

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import store
from app.db.models import User
from app.services.auth import JWTError, decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
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
        user = store.get_user_by_api_key_hash(key_hash)
        if not user:
            raise exc
        return user

    # Otherwise try JWT
    try:
        user_id = decode_access_token(token)
    except JWTError:
        raise exc

    user = store.get_user_by_id(user_id)
    if not user or not user.is_active:
        raise exc
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return current_user
