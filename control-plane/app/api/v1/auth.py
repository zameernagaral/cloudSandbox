"""Authentication endpoints: register, login, OAuth, refresh, logout."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.db.models import User, UserQuota
from app.middleware.auth import get_current_user
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserOut
from app.services.auth import (
    create_token_pair,
    get_or_create_github_user,
    hash_password,
    refresh_tokens,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=body.email, password_hash=hash_password(body.password), display_name=body.display_name)
    db.add(user)
    await db.flush()
    db.add(UserQuota(user_id=user.id))
    return await create_token_pair(user, db)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email, User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return await create_token_pair(user, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        return await refresh_tokens(body.refresh_token, db)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@router.get("/github/callback", response_model=TokenResponse)
async def github_callback(code: str, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        user = await get_or_create_github_user(code, db)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"GitHub auth failed: {exc}")
    return await create_token_pair(user, db)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
