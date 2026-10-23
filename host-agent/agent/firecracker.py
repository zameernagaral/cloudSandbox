"""
Firecracker API client.

Communicates with the Firecracker VMM over its Unix domain socket
at /run/firecracker/{vm_id}/firecracker.socket
"""

from __future__ import annotations

import asyncio
import json
import socket
import struct
from pathlib import Path
from typing import Any


class FirecrackerClient:
    """Async client for the Firecracker REST API over Unix socket."""

    def __init__(self, socket_path: str) -> None:
        self.socket_path = socket_path

    async def _request(
        self, method: str, path: str, body: dict | None = None
    ) -> tuple[int, dict]:
        """Make a synchronous HTTP request over the Unix socket (run in thread pool)."""
        return await asyncio.get_event_loop().run_in_executor(
            None, self._sync_request, method, path, body
        )

    def _sync_request(self, method: str, path: str, body: dict | None) -> tuple[int, dict]:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.connect(self.socket_path)
        try:
            body_bytes = json.dumps(body).encode() if body else b""
            request_line = f"{method} {path} HTTP/1.1\r\n"
            headers = (
                f"Host: localhost\r\n"
                f"Content-Type: application/json\r\n"
                f"Content-Length: {len(body_bytes)}\r\n"
                f"Accept: application/json\r\n"
                f"\r\n"
            )
            sock.sendall((request_line + headers).encode() + body_bytes)

            # Read response
            response = b""
            while True:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                response += chunk
                if b"\r\n\r\n" in response:
                    header_part, _, body_part = response.partition(b"\r\n\r\n")
                    # Simple content-length parsing
                    status_line = header_part.split(b"\r\n")[0].decode()
                    status_code = int(status_line.split(" ")[1])
                    try:
                        return status_code, json.loads(body_part) if body_part.strip() else {}
                    except Exception:
                        return status_code, {}
        finally:
            sock.close()
        return 500, {}

    async def configure_boot_source(
        self, kernel_image_path: str, boot_args: str = "console=ttyS0 reboot=k panic=1 pci=off"
    ) -> None:
        status, body = await self._request(
            "PUT",
            "/boot-source",
            {"kernel_image_path": kernel_image_path, "boot_args": boot_args},
        )
        if status not in (200, 204):
            raise RuntimeError(f"configure_boot_source failed: {status} {body}")

    async def configure_rootfs(self, rootfs_path: str) -> None:
        status, body = await self._request(
            "PUT",
            "/drives/rootfs",
            {
                "drive_id": "rootfs",
                "path_on_host": rootfs_path,
                "is_root_device": True,
                "is_read_only": False,
            },
        )
        if status not in (200, 204):
            raise RuntimeError(f"configure_rootfs failed: {status} {body}")

    async def configure_machine(self, vcpu_count: int, mem_size_mb: int) -> None:
        status, body = await self._request(
            "PUT",
            "/machine-config",
            {"vcpu_count": vcpu_count, "mem_size_mib": mem_size_mb},
        )
        if status not in (200, 204):
            raise RuntimeError(f"configure_machine failed: {status} {body}")

    async def configure_network(self, iface_id: str, host_dev_name: str) -> None:
        status, body = await self._request(
            "PUT",
            f"/network-interfaces/{iface_id}",
            {
                "iface_id": iface_id,
                "host_dev_name": host_dev_name,
                "guest_mac": "AA:FC:00:00:00:01",
            },
        )
        if status not in (200, 204):
            raise RuntimeError(f"configure_network failed: {status} {body}")

    async def configure_vsock(self, guest_cid: int, uds_path: str) -> None:
        """Configure vsock device for guest-host communication."""
        status, body = await self._request(
            "PUT",
            "/vsock",
            {"guest_cid": guest_cid, "uds_path": uds_path},
        )
        if status not in (200, 204):
            raise RuntimeError(f"configure_vsock failed: {status} {body}")

    async def start_vm(self) -> None:
        status, body = await self._request("PUT", "/actions", {"action_type": "InstanceStart"})
        if status not in (200, 204):
            raise RuntimeError(f"start_vm failed: {status} {body}")

    async def pause_vm(self) -> None:
        status, body = await self._request("PATCH", "/vm", {"state": "Paused"})
        if status not in (200, 204):
            raise RuntimeError(f"pause_vm failed: {status} {body}")

    async def resume_vm(self) -> None:
        status, body = await self._request("PATCH", "/vm", {"state": "Resumed"})
        if status not in (200, 204):
            raise RuntimeError(f"resume_vm failed: {status} {body}")

    async def create_snapshot(self, mem_path: str, snapshot_path: str) -> None:
        status, body = await self._request(
            "PUT",
            "/snapshot/create",
            {
                "mem_file_path": mem_path,
                "snapshot_path": snapshot_path,
                "snapshot_type": "Diff",
            },
        )
        if status not in (200, 204):
            raise RuntimeError(f"create_snapshot failed: {status} {body}")

    async def get_info(self) -> dict[str, Any]:
        status, body = await self._request("GET", "/", None)
        return body

    async def stop_vm(self) -> None:
        """Send a power-off action."""
        try:
            await self._request("PUT", "/actions", {"action_type": "SendCtrlAltDel"})
        except Exception:
            pass  # Best-effort
