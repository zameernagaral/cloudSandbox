"""Authentication service — HS256 JWT, PBKDF2 password hashing, GitHub OAuth, SQLite-backed."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from datetime import UTC, datetime, timedelta

import httpx

from app.config import get_settings
from app.db import store
from app.db.models import User
from app.schemas.auth import TokenResponse
from app.services.passwords import hash_password, verify_password

settings = get_settings()


class JWTError(Exception):
    pass


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _make_access_token(user_id: str) -> str:
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    exp = int((datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)).timestamp())
    payload = _b64url_encode(
        json.dumps({"sub": user_id, "exp": exp, "type": "access"}, separators=(",", ":")).encode()
    )
    signing_input = f"{header}.{payload}".encode("ascii")
    sig = hmac.new(settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64url_encode(sig)}"


def decode_access_token(token: str) -> str:
    """Verify HS256 JWT and return user_id or raise JWTError."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise JWTError("Malformed token")
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(
            settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256
        ).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise JWTError("Invalid signature")
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if payload.get("type") != "access":
            raise JWTError("Not an access token")
        exp = payload.get("exp")
        if exp is not None and time.time() > float(exp):
            raise JWTError("Token expired")
        sub = payload.get("sub")
        if not sub:
            raise JWTError("Missing subject")
        return str(sub)
    except JWTError:
        raise
    except Exception as exc:
        raise JWTError(f"Invalid token: {exc}") from exc


async def create_token_pair(user: User, db: object = None) -> TokenResponse:
    access_token = _make_access_token(user.id)
    raw_refresh = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_refresh.encode()).hexdigest()
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    store.save_refresh_token(user.id, token_hash, expires_at)
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.access_token_expire_minutes * 60,
    )


async def refresh_tokens(raw_refresh: str, db: object = None) -> TokenResponse:
    token_hash = hashlib.sha256(raw_refresh.encode()).hexdigest()
    user_id = store.consume_refresh_token(token_hash)
    if not user_id:
        raise ValueError("Invalid or expired refresh token")
    user = store.get_user_by_id(user_id)
    if not user:
        raise ValueError("User not found")
    return await create_token_pair(user, db)


async def get_or_create_github_user(github_code: str, db: object = None) -> User:
    async with httpx.AsyncClient() as client:
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

        profile_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github+json"},
            timeout=10,
        )
        profile_resp.raise_for_status()
        profile = profile_resp.json()

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
    user = store.get_user_by_github_id(github_id)
    if user is None:
        if primary_email:
            user = store.get_user_by_email(primary_email)
        if user is None:
            user = store.create_user(
                email=primary_email or f"github_{github_id}@noreply.github.com",
                display_name=profile.get("name") or profile.get("login"),
                username=profile.get("login"),
                avatar_url=profile.get("avatar_url"),
                github_id=github_id,
                is_admin=True,
            )
        else:
            user = store.update_user(
                user.id, github_id=github_id, avatar_url=profile.get("avatar_url")
            ) or user
    return user


async def revoke_refresh_token(raw_refresh: str, db: object = None) -> bool:
    token_hash = hashlib.sha256(raw_refresh.encode()).hexdigest()
    return store.revoke_refresh_token_by_hash(token_hash)


async def create_password_reset_token(email: str, db: object = None) -> str | None:
    user = store.get_user_by_email(email)
    if not user or not user.is_active:
        return None
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(UTC) + timedelta(minutes=15)
    store.save_reset_token(user.id, token_hash, expires_at)
    return raw_token


async def reset_password_with_token(token: str, new_password: str, db: object = None) -> bool:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    user_id = store.consume_reset_token(token_hash)
    if not user_id:
        return False
    store.update_user(user_id, password_hash=hash_password(new_password))
    return True


async def delete_user_account_and_data(user: User, db: object = None) -> None:
    store.delete_user(user.id)
