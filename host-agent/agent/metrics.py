"""Cgroup-based resource metrics reader."""

from __future__ import annotations

import asyncio
from pathlib import Path

import psutil
import structlog

log = structlog.get_logger(__name__)

# Cgroup v2 base path
CGROUP_BASE = Path("/sys/fs/cgroup")


def _cgroup_path(vm_id: str) -> Path:
    return CGROUP_BASE / "machine.slice" / f"machine-qemu\\x2d{vm_id}.scope"


async def read_cpu_seconds(vm_id: str) -> float:
    """Read CPU time from cgroup cpu.stat (nanoseconds → seconds)."""
    try:
        cg = _cgroup_path(vm_id)
        stat_file = cg / "cpu.stat"
        if not stat_file.exists():
            return 0.0
        content = stat_file.read_text()
        for line in content.splitlines():
            if line.startswith("usage_usec"):
                return int(line.split()[1]) / 1_000_000
    except Exception as exc:
        log.debug("metrics.cpu_read_failed", vm_id=vm_id, error=str(exc))
    return 0.0


async def read_memory_mb(vm_id: str) -> float:
    """Read current memory usage from cgroup memory.current."""
    try:
        cg = _cgroup_path(vm_id)
        mem_file = cg / "memory.current"
        if not mem_file.exists():
            return 0.0
        bytes_used = int(mem_file.read_text().strip())
        return bytes_used / (1024 * 1024)
    except Exception as exc:
        log.debug("metrics.mem_read_failed", vm_id=vm_id, error=str(exc))
    return 0.0


async def collect_and_push(vm_id: str, sandbox_id: str, control_plane_url: str, token: str) -> None:
    """Collect metrics and push to control plane."""
    import httpx
    cpu_s = await read_cpu_seconds(vm_id)
    mem_mb = await read_memory_mb(vm_id)
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"{control_plane_url}/internal/metrics/push",
                params={"sandbox_id": sandbox_id, "cpu_seconds": cpu_s, "memory_mb": mem_mb},
                headers={"Authorization": f"Bearer {token}"},
            )
    except Exception as exc:
        log.debug("metrics.push_failed", sandbox_id=sandbox_id, error=str(exc))


async def metrics_loop(vm_states: dict, cp_url: str, token: str) -> None:
    """Background loop that pushes metrics every 5 seconds."""
    while True:
        for vm_id, state in list(vm_states.items()):
            sandbox_id = state.get("sandbox_id")
            if sandbox_id and state.get("status") == "running":
                asyncio.create_task(collect_and_push(vm_id, sandbox_id, cp_url, token))
        await asyncio.sleep(5)
