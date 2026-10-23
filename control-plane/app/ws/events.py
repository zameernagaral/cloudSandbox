"""
Event stream WebSocket — pushes live meters and state changes to the dashboard.

The client subscribes to /ws/events/{sandbox_id}?token=...
The server fans out messages from the Redis pub/sub channel for that sandbox.
"""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.db.redis_client import get_redis, sandbox_pubsub_channel
from app.ws.terminal import _authenticate  # reuse auth helper

router = APIRouter(tags=["events"])


@router.websocket("/ws/events/{sandbox_id}")
async def events_ws(
    websocket: WebSocket,
    sandbox_id: str,
    token: str = Query(...),
) -> None:
    await websocket.accept()

    try:
        _user, _sandbox = await _authenticate(token, sandbox_id)
    except PermissionError as exc:
        await websocket.send_json({"type": "error", "message": str(exc)})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    redis = await get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(sandbox_pubsub_channel(sandbox_id))

    async def relay() -> None:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    await websocket.send_text(message["data"])
                except WebSocketDisconnect:
                    return

    async def keepalive() -> None:
        while True:
            await asyncio.sleep(15)
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                return

    done, pending = await asyncio.wait(
        [asyncio.create_task(relay()), asyncio.create_task(keepalive())],
        return_when=asyncio.FIRST_COMPLETED,
    )
    for task in pending:
        task.cancel()
    await pubsub.unsubscribe(sandbox_pubsub_channel(sandbox_id))
