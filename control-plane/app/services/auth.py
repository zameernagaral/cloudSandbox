"""Authentication service — JWT, bcrypt, GitHub OAuth."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import RefreshToken, User, UserQuota
from app.schemas.auth import TokenResponse

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _make_access_token(user_id: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": user_id, "exp": expire, "type": "access"},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )


async def create_token_pair(user: User, db: AsyncSession) -> TokenResponse:
    access_token = _make_access_token(user.id)
    raw_refresh = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_refresh.encode()).hexdigest()
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    db.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.access_token_expire_minutes * 60,
    )


async def refresh_tokens(raw_refresh: str, db: AsyncSession) -> TokenResponse:
    token_hash = hashlib.sha256(raw_refresh.encode()).hexdigest()
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,  # noqa: E712
            RefreshToken.expires_at > datetime.now(UTC),
        )
    )
    rt = result.scalar_one_or_none()
    if not rt:
        raise ValueError("Invalid or expired refresh token")
    # Rotate: revoke old, issue new
    rt.revoked = True
    user_result = await db.execute(select(User).where(User.id == rt.user_id))
    user = user_result.scalar_one()
    return await create_token_pair(user, db)


def decode_access_token(token: str) -> str:
    """Returns user_id or raises JWTError."""
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != "access":
        raise JWTError("Not an access token")
    return payload["sub"]


async def get_or_create_github_user(github_code: str, db: AsyncSession) -> User:
    """Exchange GitHub code for user profile and upsert the user."""
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": github_code,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        token_resp.raise_for_status()
        gh_token = token_resp.json().get("access_token")
        if not gh_token:
            raise ValueError("GitHub token exchange failed")

        # Get profile
        profile_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github+json"},
            timeout=10,
        )
        profile_resp.raise_for_status()
        profile = profile_resp.json()

        # Get emails
        emails_resp = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {gh_token}"},
            timeout=10,
        )
        emails_resp.raise_for_status()
        primary_email = next(
            (e["email"] for e in emails_resp.json() if e.get("primary")),
            profile.get("email"),
        )

    github_id = str(profile["id"])
    result = await db.execute(select(User).where(User.github_id == github_id))
    user = result.scalar_one_or_none()

    if user is None:
        # Check if email already exists (link accounts)
        if primary_email:
            email_result = await db.execute(select(User).where(User.email == primary_email))
            user = email_result.scalar_one_or_none()

        if user is None:
            user = User(
                email=primary_email or f"github_{github_id}@noreply.github.com",
                display_name=profile.get("name") or profile.get("login"),
                username=profile.get("login"),
                avatar_url=profile.get("avatar_url"),
                github_id=github_id,
            )
            db.add(user)
            await db.flush()
            db.add(UserQuota(user_id=user.id))
        else:
            user.github_id = github_id
            user.avatar_url = profile.get("avatar_url")
    return user
