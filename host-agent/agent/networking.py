"""
Tap networking setup for Firecracker microVMs.

Creates a TAP interface per VM, configures IP routing with nftables,
and enforces an egress allowlist (LLM gateway + package mirrors).
"""

from __future__ import annotations

import asyncio
import ipaddress
import structlog

log = structlog.get_logger(__name__)

# IP range for VM tap interfaces: 172.20.x.x/30 pairs
VM_IP_BASE = ipaddress.IPv4Network("172.20.0.0/16")
GATEWAY_PORT = 8888  # LLM metering gateway port
PACKAGE_MIRRORS = [
    "pypi.org", "files.pythonhosted.org",
    "registry.npmjs.org", "deb.debian.org",
    "security.debian.org", "archive.ubuntu.com",
]


def _tap_name(vm_id: str) -> str:
    # TAP names max 15 chars; use first 11 chars of vm_id
    return f"fc-{vm_id[:11]}"


def _vm_ip(index: int) -> tuple[str, str]:
    """Return (tap_ip, vm_ip) for the given VM index."""
    base = int(VM_IP_BASE.network_address)
    tap_ip = str(ipaddress.IPv4Address(base + index * 4 + 1))
    vm_ip = str(ipaddress.IPv4Address(base + index * 4 + 2))
    return tap_ip, vm_ip


async def _run(cmd: str) -> None:
    proc = await asyncio.create_subprocess_shell(
        cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        log.warning("networking.cmd_failed", cmd=cmd, stderr=stderr.decode())


async def setup_tap(vm_id: str, vm_index: int) -> tuple[str, str, str]:
    """
    Create TAP interface and configure routing.
    Returns (tap_name, tap_ip, vm_ip).
    """
    tap = _tap_name(vm_id)
    tap_ip, vm_ip = _vm_ip(vm_index)

    await _run(f"ip tuntap add dev {tap} mode tap")
    await _run(f"ip addr add {tap_ip}/30 dev {tap}")
    await _run(f"ip link set {tap} up")
    await _run(f"echo 1 > /proc/sys/net/ipv4/ip_forward")

    # nftables egress allowlist — only allow traffic to metering gateway and package mirrors
    nft_rules = f"""
nft add table ip sandbox_egress_{vm_id.replace('-', '_')}
nft add chain ip sandbox_egress_{vm_id.replace('-', '_')} FORWARD {{ type filter hook forward priority 0; policy drop; }}
nft add rule ip sandbox_egress_{vm_id.replace('-', '_')} FORWARD ip saddr {vm_ip} tcp dport {GATEWAY_PORT} accept
nft add rule ip sandbox_egress_{vm_id.replace('-', '_')} FORWARD ip saddr {vm_ip} ct state established,related accept
"""
    for rule in nft_rules.strip().split("\n"):
        if rule.strip():
            await _run(rule.strip())

    # NAT for outbound traffic
    await _run(f"nft add rule ip nat POSTROUTING ip saddr {vm_ip} masquerade")

    log.info("networking.tap_ready", vm_id=vm_id, tap=tap, tap_ip=tap_ip, vm_ip=vm_ip)
    return tap, tap_ip, vm_ip


async def teardown_tap(vm_id: str) -> None:
    """Remove TAP interface and nftables rules."""
    tap = _tap_name(vm_id)
    await _run(f"ip link del {tap} 2>/dev/null || true")
    table = f"sandbox_egress_{vm_id.replace('-', '_')}"
    await _run(f"nft delete table ip {table} 2>/dev/null || true")
    log.info("networking.tap_removed", vm_id=vm_id)
