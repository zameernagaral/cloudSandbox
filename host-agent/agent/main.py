"""
Host Agent — FastAPI app running on the KVM-enabled machine.

Endpoints:
  POST /vm/create                   — create and start a microVM
  PATCH /vm/{vm_id}/state           — pause / resume
  DELETE /vm/{vm_id}                — destroy
  GET  /vm/{vm_id}/status           — status
  WS  /terminal/{vm_id}?token=...   — vsock PTY bridge
  GET  /health                      — health check

Talks back to the control plane via the callback_url and heartbeat.
"""

from __future__ import annotations

import asyncio
import os
import uuid

import httpx
import structlog
import uvicorn
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel
from pydantic_settings import BaseSettings

from agent.firecracker import FirecrackerClient
from agent.jailer import JailedVM, KERNEL_PATH
from agent.metrics import metrics_loop
from agent.networking import setup_tap, teardown_tap
from agent.vsock import router as vsock_router

log = structlog.get_logger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────


class AgentSettings(BaseSettings):
    host_agent_token: str = "change-me"
    control_plane_url: str = "http://localhost:8000"
    host_id: str = ""
    agent_port: int = 8765
    model_config = {"env_file": ".env"}


_settings = AgentSettings()
HOST_AGENT_TOKEN = _settings.host_agent_token

# ── VM state ──────────────────────────────────────────────────────────────────
VMS: dict[str, dict] = {}  # vm_id → {sandbox_id, status, jailed_vm, client, ...}
_vm_index_counter = 0

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Cloud Sandbox Host Agent", docs_url=None)
router = APIRouter()


def _verify_token(authorization: str = Header(...)) -> None:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or token != HOST_AGENT_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Schemas ───────────────────────────────────────────────────────────────────


class CreateVMRequest(BaseModel):
    sandbox_id: str
    vcpu_count: int = 1
    mem_size_mb: int = 512
    callback_url: str


class StateRequest(BaseModel):
    state: str  # "Paused" | "Resumed"


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/vm/create")
async def create_vm(body: CreateVMRequest, _auth: None = Depends(_verify_token)) -> dict:
    """Create and start a microVM. Calls back to CP when ready."""
    global _vm_index_counter
    vm_id = str(uuid.uuid4())[:8]
    _vm_index_counter += 1

    jailed = JailedVM(vm_id, body.sandbox_id)
    await jailed.setup_jail(body.vcpu_count, body.mem_size_mb)
    await jailed.start(body.vcpu_count, body.mem_size_mb)

    # Configure VM via Firecracker API
    fc = FirecrackerClient(jailed.socket_path)
    tap, tap_ip, vm_ip = await setup_tap(vm_id, _vm_index_counter)
    guest_cid = 100 + _vm_index_counter

    await fc.configure_boot_source(KERNEL_PATH)
    await fc.configure_rootfs(str(jailed.jail_dir / "rootfs.ext4"))
    await fc.configure_machine(body.vcpu_count, body.mem_size_mb)
    await fc.configure_network("eth0", tap)
    await fc.configure_vsock(guest_cid, "/run/vsock.sock")
    await fc.start_vm()

    VMS[vm_id] = {
        "sandbox_id": body.sandbox_id,
        "status": "running",
        "jailed_vm": jailed,
        "fc_client": fc,
        "vsock_uds_path": jailed.vsock_path,
        "tap": tap,
        "vm_ip": vm_ip,
    }

    log.info("host_agent.vm_created", vm_id=vm_id, sandbox_id=body.sandbox_id)

    # Callback to control plane
    asyncio.create_task(_notify_started(body.callback_url, vm_id))

    return {"vm_id": vm_id, "status": "started"}


async def _notify_started(callback_url: str, vm_id: str) -> None:
    """Wait for guest agent to be ready, then notify control plane."""
    # Give guest agent 10s to boot
    await asyncio.sleep(10)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                callback_url,
                params={"vm_id": vm_id},
                headers={"Authorization": f"Bearer {HOST_AGENT_TOKEN}"},
            )
    except Exception as exc:
        log.error("host_agent.callback_failed", vm_id=vm_id, error=str(exc))


@router.patch("/vm/{vm_id}/state")
async def set_vm_state(
    vm_id: str, body: StateRequest, _auth: None = Depends(_verify_token)
) -> dict:
    vm = VMS.get(vm_id)
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    fc: FirecrackerClient = vm["fc_client"]
    if body.state == "Paused":
        await fc.pause_vm()
        vm["status"] = "paused"
    elif body.state == "Resumed":
        await fc.resume_vm()
        vm["status"] = "running"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown state: {body.state}")
    return {"vm_id": vm_id, "state": body.state}


@router.delete("/vm/{vm_id}")
async def destroy_vm(vm_id: str, _auth: None = Depends(_verify_token)) -> dict:
    vm = VMS.pop(vm_id, None)
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    jailed: JailedVM = vm["jailed_vm"]
    await jailed.stop()
    await teardown_tap(vm_id)
    log.info("host_agent.vm_destroyed", vm_id=vm_id)
    return {"vm_id": vm_id, "status": "destroyed"}


@router.get("/vm/{vm_id}/status")
async def vm_status(vm_id: str, _auth: None = Depends(_verify_token)) -> dict:
    vm = VMS.get(vm_id)
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    return {"vm_id": vm_id, "status": vm["status"], "sandbox_id": vm["sandbox_id"]}


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "vms": len(VMS)}


app.include_router(router)
app.include_router(vsock_router)


@app.on_event("startup")
async def startup() -> None:
    log.info("host_agent.starting", port=_settings.agent_port)
    asyncio.create_task(metrics_loop(VMS, _settings.control_plane_url, HOST_AGENT_TOKEN))
    asyncio.create_task(_heartbeat_loop())


async def _heartbeat_loop() -> None:
    while True:
        if _settings.host_id:
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    await client.post(
                        f"{_settings.control_plane_url}/internal/host/{_settings.host_id}/heartbeat",
                        headers={"Authorization": f"Bearer {HOST_AGENT_TOKEN}"},
                    )
            except Exception:
                pass
        await asyncio.sleep(30)


def main() -> None:
    uvicorn.run(app, host="0.0.0.0", port=_settings.agent_port, log_level="info")


if __name__ == "__main__":
    main()
