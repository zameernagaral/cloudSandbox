"""
Terminal WebSocket gateway.

Flow: Browser xterm.js  ←→  FastAPI WS  ←→  Host Agent WS  ←→  vsock  ←→  Guest PTY

The gateway:
  - Authenticates the connection via query-param token
  - Verifies sandbox ownership
  - Opens a WS connection to the host agent's terminal endpoint
  - Bidirectionally relays bytes
  - Stores scrollback in Redis (capped at 10,000 lines)
  - Handles resize messages
  - Supports reconnect with scrollback replay
"""

from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime

import websockets
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import AsyncSessionLocal
from app.db.models import Sandbox, SandboxState, User
from app.db.redis_client import (
    get_redis,
    sandbox_pubsub_channel,
    sandbox_scrollback_key,
    sandbox_state_key,
)
from app.services.auth import decode_access_token

router = APIRouter(tags=["terminal"])

SCROLLBACK_MAX = 10_000


async def _authenticate(token: str, sandbox_id: str) -> tuple[User, Sandbox]:
    """Verify JWT and sandbox ownership. Returns (user, sandbox)."""
    try:
        user_id = decode_access_token(token)
    except JWTError:
        raise PermissionError("Invalid token")

    async with AsyncSessionLocal() as db:
        user_result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))  # noqa: E712
        user = user_result.scalar_one_or_none()
        if not user:
            raise PermissionError("User not found")

        sb_result = await db.execute(
            select(Sandbox).where(Sandbox.id == sandbox_id, Sandbox.owner_id == user_id)
        )
        sandbox = sb_result.scalar_one_or_none()
        if not sandbox:
            raise PermissionError("Sandbox not found or access denied")
        return user, sandbox


@router.websocket("/ws/terminal/{sandbox_id}")
async def terminal_ws(
    websocket: WebSocket,
    sandbox_id: str,
    token: str = Query(...),
) -> None:
    """Main terminal WebSocket endpoint."""
    await websocket.accept()

    try:
        user, sandbox = await _authenticate(token, sandbox_id)
    except PermissionError as exc:
        await websocket.send_json({"type": "error", "message": str(exc)})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    if sandbox.state == SandboxState.DESTROYED:
        await websocket.send_json({"type": "error", "message": "Sandbox is destroyed"})
        await websocket.close()
        return

    # Replay scrollback to newly connected client
    redis = await get_redis()
    scrollback = await redis.lrange(sandbox_scrollback_key(sandbox_id), 0, -1)
    if scrollback:
        for line in scrollback:
            await websocket.send_text(line)

    if sandbox.state == SandboxState.FROZEN:
        await websocket.send_json(
            {"type": "frozen", "reason": sandbox.trip_reason or "Sandbox is frozen"}
        )
        # Keep connection open to receive state-change events
        await _subscribe_events_only(websocket, sandbox_id)
        return

    # Connect to host agent terminal WS
    from app.config import get_settings
    from sqlalchemy import select as sa_select
    from app.db.models import Host

    settings = get_settings()
    async with AsyncSessionLocal() as db:
        host_result = await db.execute(sa_select(Host).where(Host.id == sandbox.host_id))
        host = host_result.scalar_one_or_none()

    if not host:
        await websocket.send_json({"type": "error", "message": "Host not found"})
        await websocket.close()
        return

    agent_ws_url = (
        host.agent_url.rstrip("/") + f"/terminal/{sandbox.vm_id}"
        + f"?token={settings.host_agent_token}"
    )

    try:
        async with websockets.connect(agent_ws_url) as agent_ws:
            await _relay_bidirectional(websocket, agent_ws, sandbox_id, redis)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "message": f"Host connection lost: {exc}"})
        except Exception:
            pass


async def _relay_bidirectional(
    client_ws: WebSocket,
    agent_ws: websockets.WebSocketClientProtocol,
    sandbox_id: str,
    redis: object,
) -> None:
    """Relay bytes between browser and host agent; store scrollback."""

    async def from_agent() -> None:
        async for message in agent_ws:
            # Store in scrollback
            await redis.rpush(sandbox_scrollback_key(sandbox_id), message)
            await redis.ltrim(sandbox_scrollback_key(sandbox_id), -SCROLLBACK_MAX, -1)
            await client_ws.send_text(message if isinstance(message, str) else message.decode())

    async def from_client() -> None:
        while True:
            try:
                data = await client_ws.receive_text()
            except WebSocketDisconnect:
                return
            msg = json.loads(data) if data.startswith("{") else None
            if msg and msg.get("type") == "resize":
                await agent_ws.send(json.dumps({"type": "resize", "cols": msg["cols"], "rows": msg["rows"]}))
            else:
                await agent_ws.send(data)

    await asyncio.gather(from_agent(), from_client(), return_exceptions=True)


async def _subscribe_events_only(websocket: WebSocket, sandbox_id: str) -> None:
    """Keep WS alive while sandbox is frozen; relay state-change events."""
    redis = await get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(sandbox_pubsub_channel(sandbox_id))
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    await websocket.send_text(message["data"])
                except WebSocketDisconnect:
                    break
                # If state changed to RUNNING, client should reconnect
                import json as _json
                payload = _json.loads(message["data"])
                if payload.get("payload", {}).get("state") == "RUNNING":
                    break
    finally:
        await pubsub.unsubscribe(sandbox_pubsub_channel(sandbox_id))
