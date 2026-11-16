"""Authentication endpoints: register, login, OAuth, refresh, logout, password reset, account deletion."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.config import get_settings
from app.db import store
from app.db.models import AuditEventType, User
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
    refresh_tokens,
    reset_password_with_token,
    revoke_refresh_token,
)
from app.services.passwords import hash_password, verify_password

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, tokens: TokenResponse) -> None:
    is_prod = settings.environment == "production"
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
) -> TokenResponse:
    await rate_limit(request, "auth_register", limit=20, window_s=60)

    if store.get_user_by_email(body.email):
        raise HTTPException(status_code=409, detail="Email already registered")

    user = store.create_user(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name or body.email.split("@")[0],
        is_admin=True,
    )
    tokens = await create_token_pair(user)
    _set_auth_cookies(response, tokens)
    store.add_audit_event(AuditEventType.AUTH_LOGIN, user_id=user.id, payload={"action": "register"})
    return tokens


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
) -> TokenResponse:
    await rate_limit(request, "auth_login", limit=20, window_s=60)

    user = store.get_user_by_email(body.email)
    if not user or not user.is_active or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    tokens = await create_token_pair(user)
    _set_auth_cookies(response, tokens)
    store.add_audit_event(AuditEventType.AUTH_LOGIN, user_id=user.id, payload={"email": user.email})
    return tokens


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    body: RefreshRequest,
) -> MessageResponse:
    await revoke_refresh_token(body.refresh_token)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return MessageResponse(success=True, message="Successfully logged out")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    body: RefreshRequest,
) -> TokenResponse:
    try:
        tokens = await refresh_tokens(body.refresh_token)
        _set_auth_cookies(response, tokens)
        return tokens
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
) -> MessageResponse:
    await rate_limit(request, "auth_forgot_pwd", limit=5, window_s=60)
    await create_password_reset_token(body.email)
    return MessageResponse(
        success=True,
        message="If an account exists with this email, a password reset link has been dispatched.",
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest) -> MessageResponse:
    success = await reset_password_with_token(body.token, body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return MessageResponse(success=True, message="Password successfully reset. You may now log in.")


@router.get("/github/callback", response_model=TokenResponse)
async def github_callback(
    response: Response,
    code: str,
) -> TokenResponse:
    try:
        user = await get_or_create_github_user(code)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"GitHub auth failed: {exc}")
    tokens = await create_token_pair(user)
    _set_auth_cookies(response, tokens)
    return tokens


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.delete("/me", response_model=MessageResponse)
async def delete_my_data(current_user: User = Depends(get_current_user)) -> MessageResponse:
    await delete_user_account_and_data(current_user)
    return MessageResponse(success=True, message="All user data and associated records permanently deleted.")
