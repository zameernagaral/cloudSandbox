"""Terminal WebSocket gateway powered by built-in virtual PTY + Redis scrollback."""

from __future__ import annotations

import asyncio
import hashlib
import json

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.db import store
from app.db.models import Sandbox, SandboxState, User
from app.db.redis_client import get_redis, sandbox_pubsub_channel, sandbox_scrollback_key
from app.services import runtime
from app.services.auth import JWTError, decode_access_token

router = APIRouter(tags=["terminal"])


async def _authenticate(token: str, sandbox_id: str) -> tuple[User, Sandbox]:
    user: User | None = None
    if token.startswith("sk-"):
        key_hash = hashlib.sha256(token.encode()).hexdigest()
        user = store.get_user_by_api_key_hash(key_hash)
    else:
        try:
            user_id = decode_access_token(token)
            user = store.get_user_by_id(user_id)
        except JWTError:
            user = None

    if not user or not user.is_active:
        raise PermissionError("Invalid token")

    sandbox = store.get_sandbox_for_user(sandbox_id, user.id)
    if not sandbox:
        raise PermissionError("Sandbox not found or access denied")
    return user, sandbox


@router.websocket("/ws/terminal/{sandbox_id}")
async def terminal_ws(
    websocket: WebSocket,
    sandbox_id: str,
    token: str = Query(...),
) -> None:
    await websocket.accept()
    try:
        _user, sandbox = await _authenticate(token, sandbox_id)
    except PermissionError as exc:
        await websocket.send_json({"type": "error", "message": str(exc)})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    if sandbox.state == SandboxState.DESTROYED:
        await websocket.send_json({"type": "error", "message": "Sandbox is destroyed"})
        await websocket.close()
        return

    # Send greeting and existing logs
    logs = runtime.get_logs(sandbox.id)
    await websocket.send_text(
        f"\x1b[32m● Connected to Firecracker microVM ({sandbox.name} / vsock:cid 3:1024)\x1b[0m\r\n"
    )
    for entry in logs[-25:]:
        await websocket.send_text(f"\x1b[90m[{entry['time']}]\x1b[0m {entry['text']}\r\n")
    await websocket.send_text("\x1b[32mroot@cloud-sandbox:~# \x1b[0m")

    redis = await get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(sandbox_pubsub_channel(sandbox.id))
    input_buf = ""

    async def from_pubsub() -> None:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                evt = json.loads(message["data"])
                if evt.get("type") == "killswitch_tripped":
                    await websocket.send_json({"type": "frozen", "reason": evt["payload"].get("reason", "Frozen")})
                elif evt.get("type") == "log":
                    entry = evt.get("payload", {})
                    if entry.get("type") != "cmd":
                        await websocket.send_text(f"\r\n\x1b[36m[{entry.get('time', '')}] {entry.get('text', '')}\x1b[0m\r\n\x1b[32mroot@cloud-sandbox:~# \x1b[0m")
            except Exception:
                pass

    async def from_client() -> None:
        nonlocal input_buf
        while True:
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect:
                return
            if data.startswith("{"):
                try:
                    msg = json.loads(data)
                    if msg.get("type") == "resize":
                        continue
                except Exception:
                    pass
            if data == "\r":
                cmd = input_buf
                input_buf = ""
                await websocket.send_text("\r\n")
                if cmd.strip():
                    entries = await runtime.exec_command(sandbox.id, cmd)
                    for e in entries[1:]:
                        await websocket.send_text(f"{e['text']}\r\n")
                await websocket.send_text("\x1b[32mroot@cloud-sandbox:~# \x1b[0m")
            elif data in ("\x7f", "\b"):
                if input_buf:
                    input_buf = input_buf[:-1]
                    await websocket.send_text("\b \b")
            elif data and ord(data[0]) != 27:
                input_buf += data
                await websocket.send_text(data)

    try:
        done, pending = await asyncio.wait(
            [asyncio.create_task(from_pubsub()), asyncio.create_task(from_client())],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
    finally:
        await pubsub.unsubscribe(sandbox_pubsub_channel(sandbox.id))
