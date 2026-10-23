"""Token-bucket rate limiting backed by Redis."""

from __future__ import annotations

import time

from fastapi import Depends, HTTPException, Request, status

from app.db.redis_client import get_redis, user_rate_limit_key


async def rate_limit(
    request: Request,
    key_suffix: str,
    limit: int,
    window_s: int,
) -> None:
    """Sliding-window rate limiter using Redis sorted sets."""
    redis = await get_redis()
    # Use user ID if available, otherwise IP
    user_id = getattr(request.state, "user_id", request.client.host if request.client else "anon")
    key = user_rate_limit_key(user_id, key_suffix)
    now = time.time()
    window_start = now - window_s

    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window_s + 1)
    results = await pipe.execute()
    count = results[2]

    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Max {limit} requests per {window_s}s.",
            headers={"Retry-After": str(window_s)},
        )
