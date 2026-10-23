"""
Vsock bridge — connects guest PTY (via vsock) to the host-side WebSocket terminal endpoint.

The guest agent opens a vsock listener on port 3000.
This module:
  1. Connects to the vsock socket on the host side
  2. Exposes a WebSocket endpoint per VM at /terminal/{vm_id}
  3. Relays bytes bidirectionally (including PTY resize)
"""

from __future__ import annotations

import asyncio
import json
import os
import socket
import struct
from pathlib import Path

import structlog
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

log = structlog.get_logger(__name__)

router = APIRouter(tags=["terminal"])

VSOCK_PORT = 3000  # Guest agent listens on this vsock port
VSOCK_TIMEOUT = 5  # seconds to wait for guest agent connection


def _open_vsock(guest_cid: int, port: int) -> socket.socket:
    """Open an AF_VSOCK connection to the guest."""
    # AF_VSOCK = 40 on Linux
    AF_VSOCK = 40
    sock = socket.socket(AF_VSOCK, socket.SOCK_STREAM)
    sock.settimeout(VSOCK_TIMEOUT)
    sock.connect((guest_cid, port))
    sock.setblocking(False)
    return sock


def _open_vsock_via_uds(uds_path: str) -> socket.socket:
    """
    Fallback: connect via the vsock UDS path exposed by Firecracker.
    Firecracker exposes the vsock as a Unix domain socket on the host.
    """
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.connect(uds_path)
    sock.setblocking(False)
    return sock


@router.websocket("/terminal/{vm_id}")
async def terminal_proxy(
    websocket: WebSocket,
    vm_id: str,
    token: str = Query(...),
) -> None:
    """Bridge browser ↔ host WebSocket ↔ vsock ↔ guest PTY."""
    from agent.main import VMS, HOST_AGENT_TOKEN
    if token != HOST_AGENT_TOKEN:
        await websocket.close(code=1008)
        return

    vm_state = VMS.get(vm_id)
    if not vm_state:
        await websocket.close(code=1011)
        return

    await websocket.accept()

    # Connect to guest via vsock UDS
    uds_path = vm_state.get("vsock_uds_path")
    if not uds_path or not Path(uds_path).exists():
        await websocket.send_text("[guest agent not ready]\r\n")
        await websocket.close()
        return

    loop = asyncio.get_event_loop()
    try:
        vsock = await loop.run_in_executor(None, _open_vsock_via_uds, uds_path)
    except Exception as exc:
        await websocket.send_text(f"[vsock connect failed: {exc}]\r\n")
        await websocket.close()
        return

    async def from_guest() -> None:
        """Read bytes from vsock and send to WebSocket."""
        while True:
            try:
                data = await loop.run_in_executor(None, vsock.recv, 4096)
                if not data:
                    break
                await websocket.send_bytes(data)
            except Exception:
                break

    async def from_browser() -> None:
        """Read from WebSocket and write to vsock."""
        while True:
            try:
                data = await websocket.receive()
            except WebSocketDisconnect:
                break
            if "bytes" in data:
                await loop.run_in_executor(None, vsock.sendall, data["bytes"])
            elif "text" in data:
                text = data["text"]
                try:
                    msg = json.loads(text)
                    if msg.get("type") == "resize":
                        # Send TIOCSWINSZ control message
                        resize_msg = json.dumps({
                            "type": "resize",
                            "cols": msg["cols"],
                            "rows": msg["rows"],
                        }).encode() + b"\n"
                        await loop.run_in_executor(None, vsock.sendall, resize_msg)
                        continue
                except Exception:
                    pass
                await loop.run_in_executor(None, vsock.sendall, text.encode())

    try:
        await asyncio.gather(from_guest(), from_browser(), return_exceptions=True)
    finally:
        vsock.close()
