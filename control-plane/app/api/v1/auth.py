"""Authentication endpoints: register, login, OAuth, refresh, logout, password reset, account deletion."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.base import get_db
from app.db.models import User, UserQuota
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import rate_limit
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)
from app.services.auth import (
    create_password_reset_token,
    create_token_pair,
    delete_user_account_and_data,
    get_or_create_github_user,
    hash_password,
    refresh_tokens,
    reset_password_with_token,
    revoke_refresh_token,
    verify_password,
)

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, tokens: TokenResponse) -> None:
    is_prod = settings.environment == "production"
    # HttpOnly, SameSite=Lax (or Strict)
    response.set_cookie(
        key="access_token",
        value=tokens.access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=is_prod,
        samesite="lax",
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        max_age=settings.refresh_token_expire_days * 86400,
        httponly=True,
        secure=is_prod,
        samesite="lax",
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    # Rate limit registration: max 10 requests per minute
    await rate_limit(request, "auth_register", limit=10, window_s=60)

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=body.email, password_hash=hash_password(body.password), display_name=body.display_name)
    db.add(user)
    await db.flush()
    db.add(UserQuota(user_id=user.id))
    tokens = await create_token_pair(user, db)
    _set_auth_cookies(response, tokens)
    return tokens


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    # Rate limit login: max 10 requests per minute
    await rate_limit(request, "auth_login", limit=10, window_s=60)

    result = await db.execute(select(User).where(User.email == body.email, User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()
    # Identical error message for wrong email and wrong password
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    tokens = await create_token_pair(user, db)
    _set_auth_cookies(response, tokens)
    return tokens


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await revoke_refresh_token(body.refresh_token, db)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return MessageResponse(success=True, message="Successfully logged out")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        tokens = await refresh_tokens(body.refresh_token, db)
        _set_auth_cookies(response, tokens)
        return tokens
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    # Rate limit: max 5 requests per minute
    await rate_limit(request, "auth_forgot_pwd", limit=5, window_s=60)
    # Identical response whether or not the email exists
    await create_password_reset_token(body.email, db)
    return MessageResponse(
        success=True,
        message="If an account exists with this email, a password reset link has been dispatched.",
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    success = await reset_password_with_token(body.token, body.new_password, db)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return MessageResponse(success=True, message="Password successfully reset. You may now log in.")


@router.get("/github/callback", response_model=TokenResponse)
async def github_callback(
    response: Response,
    code: str,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        user = await get_or_create_github_user(code, db)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"GitHub auth failed: {exc}")
    tokens = await create_token_pair(user, db)
    _set_auth_cookies(response, tokens)
    return tokens


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.delete("/me", response_model=MessageResponse)
async def delete_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Delete-my-data route: cascades deletion of user, sandboxes, policies, and credentials."""
    await delete_user_account_and_data(current_user, db)
    return MessageResponse(success=True, message="All user data and associated records permanently deleted.")
