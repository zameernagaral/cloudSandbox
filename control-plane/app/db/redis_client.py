"""Redis client factory — one async connection pool for the whole app."""

from __future__ import annotations

import redis.asyncio as aioredis

from app.config import get_settings

settings = get_settings()

_redis_pool: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = await aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
        )
    return _redis_pool


async def close_redis() -> None:
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None


# ── Key namespaces ────────────────────────────────────────────────────────────

def sandbox_state_key(sandbox_id: str) -> str:
    return f"sandbox:state:{sandbox_id}"

def sandbox_meters_key(sandbox_id: str) -> str:
    return f"sandbox:meters:{sandbox_id}"

def sandbox_tpm_key(sandbox_id: str) -> str:
    """Tokens-per-minute sliding window key."""
    return f"sandbox:tpm:{sandbox_id}"

def sandbox_rpm_key(sandbox_id: str) -> str:
    """Requests-per-minute sliding window key."""
    return f"sandbox:rpm:{sandbox_id}"

def sandbox_scrollback_key(sandbox_id: str) -> str:
    return f"sandbox:scrollback:{sandbox_id}"

def sandbox_pubsub_channel(sandbox_id: str) -> str:
    return f"sandbox:events:{sandbox_id}"

def user_rate_limit_key(user_id: str, endpoint: str) -> str:
    return f"rate:{user_id}:{endpoint}"

def host_heartbeat_key(host_id: str) -> str:
    return f"host:heartbeat:{host_id}"

def loop_detection_key(sandbox_id: str) -> str:
    return f"sandbox:loop:{sandbox_id}"
