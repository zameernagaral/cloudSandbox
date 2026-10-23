"""
Jailer wrapper — runs each Firecracker microVM inside the jailer for isolation.

The jailer:
  - Creates a chroot jail under /srv/jailer/<vm_id>/
  - Drops privileges to a dedicated unprivileged uid/gid
  - Applies seccomp filters and cgroup constraints
  - Links kernel and rootfs into the jail

This module manages the jailer process lifecycle.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import uuid
from pathlib import Path

import structlog

log = structlog.get_logger(__name__)

JAILER_BIN = "/usr/local/bin/jailer"
FIRECRACKER_BIN = "/usr/local/bin/firecracker"
JAILER_BASE = Path("/srv/jailer")
KERNEL_PATH = "/var/lib/cloud-sandbox/vmlinux"
BASE_ROOTFS = "/var/lib/cloud-sandbox/base-rootfs.ext4"


def _next_uid() -> int:
    """Return next available unprivileged UID for jailer isolation."""
    # Use a fixed range 10000–19999; real impl tracks used UIDs in state file
    import random
    return random.randint(10000, 19999)


class JailedVM:
    """Represents a jailer-managed Firecracker microVM."""

    def __init__(self, vm_id: str, sandbox_id: str) -> None:
        self.vm_id = vm_id
        self.sandbox_id = sandbox_id
        self.uid = _next_uid()
        self.gid = self.uid
        self.jail_dir = JAILER_BASE / vm_id / "root"
        self.socket_path = str(JAILER_BASE / vm_id / "root" / "run" / "firecracker.socket")
        self.vsock_path = str(JAILER_BASE / vm_id / "root" / "run" / "vsock.sock")
        self._process: asyncio.subprocess.Process | None = None

    async def setup_jail(self, vcpu_count: int, mem_size_mb: int) -> None:
        """Prepare the jail directory and copy/link required files."""
        self.jail_dir.mkdir(parents=True, exist_ok=True)
        run_dir = self.jail_dir / "run"
        run_dir.mkdir(exist_ok=True)

        # Copy rootfs (sandbox-specific overlay)
        rootfs_dest = self.jail_dir / "rootfs.ext4"
        if not rootfs_dest.exists():
            await asyncio.get_event_loop().run_in_executor(
                None, shutil.copy2, BASE_ROOTFS, str(rootfs_dest)
            )

        # Resize rootfs to 10GB (sparse)
        await asyncio.create_subprocess_exec(
            "truncate", "--size=10G", str(rootfs_dest),
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
        )

        log.info("jailer.jail_ready", vm_id=self.vm_id, jail_dir=str(self.jail_dir))

    async def start(self, vcpu_count: int, mem_size_mb: int) -> None:
        """Start the jailer + Firecracker process."""
        cmd = [
            JAILER_BIN,
            "--id", self.vm_id,
            "--exec-file", FIRECRACKER_BIN,
            "--uid", str(self.uid),
            "--gid", str(self.gid),
            "--chroot-base-dir", str(JAILER_BASE),
            "--",
            "--api-sock", "/run/firecracker.socket",
            "--log-path", "/run/firecracker.log",
            "--level", "Info",
        ]
        log.info("jailer.starting", vm_id=self.vm_id, cmd=" ".join(cmd))
        self._process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        # Wait for socket to appear (up to 5s)
        for _ in range(50):
            if Path(self.socket_path).exists():
                break
            await asyncio.sleep(0.1)
        else:
            raise RuntimeError(f"Firecracker socket never appeared at {self.socket_path}")
        log.info("jailer.started", vm_id=self.vm_id)

    async def stop(self) -> None:
        """Terminate the jailer process and clean up."""
        if self._process:
            try:
                self._process.terminate()
                await asyncio.wait_for(self._process.wait(), timeout=5)
            except (ProcessLookupError, asyncio.TimeoutError):
                try:
                    self._process.kill()
                except ProcessLookupError:
                    pass

        # Clean up jail directory
        try:
            shutil.rmtree(str(JAILER_BASE / self.vm_id), ignore_errors=True)
        except Exception as exc:
            log.warning("jailer.cleanup_failed", vm_id=self.vm_id, error=str(exc))
        log.info("jailer.stopped", vm_id=self.vm_id)

    @property
    def is_running(self) -> bool:
        return self._process is not None and self._process.returncode is None
