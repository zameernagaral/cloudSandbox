"""Built-in Virtual Firecracker MicroVM & Real-Time Killswitch Simulation Engine."""

from __future__ import annotations

import asyncio
import json
import random
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from app.db import store
from app.db.models import AuditEventType, Sandbox, SandboxState
from app.db.redis_client import (
    get_redis,
    sandbox_meters_key,
    sandbox_pubsub_channel,
    sandbox_scrollback_key,
    sandbox_state_key,
)
from app.schemas.sandbox import SandboxEvent

_active_tasks: dict[str, asyncio.Task[None]] = {}
_logs_store: dict[str, list[dict[str, str]]] = defaultdict(list)


def _now_time_str() -> str:
    now = datetime.now()
    return now.strftime("%H:%M:%S.") + f"{now.microsecond // 1000:03d}"


async def append_log(sandbox_id: str, text: str, log_type: str = "system") -> dict[str, str]:
    entry = {"time": _now_time_str(), "type": log_type, "text": text}
    _logs_store[sandbox_id].append(entry)
    if len(_logs_store[sandbox_id]) > 250:
        _logs_store[sandbox_id] = _logs_store[sandbox_id][-250:]

    redis = await get_redis()
    ansi_color = {
        "system": "\x1b[90m",
        "agent": "\x1b[0m",
        "gateway": "\x1b[36m",
        "warning": "\x1b[33m",
        "killswitch": "\x1b[1;36m",
        "success": "\x1b[32m",
        "cmd": "\x1b[32m",
    }.get(log_type, "\x1b[0m")
    ansi_line = f"{ansi_color}[{entry['time']}] {text}\x1b[0m\r\n"
    await redis.rpush(sandbox_scrollback_key(sandbox_id), ansi_line)
    await redis.ltrim(sandbox_scrollback_key(sandbox_id), -250, -1)

    event = SandboxEvent(
        type="log",
        sandbox_id=sandbox_id,
        timestamp=datetime.now(UTC),
        payload=entry,
    )
    await redis.publish(sandbox_pubsub_channel(sandbox_id), event.model_dump_json())
    return entry


def ensure_default_logs(sb: Sandbox) -> list[dict[str, str]]:
    if _logs_store[sb.id]:
        return list(_logs_store[sb.id])

    initial: list[dict[str, str]] = [
        {
            "time": "00:00:00.012",
            "type": "system",
            "text": f"[FIRECRACKER] MicroVM {sb.vm_id or sb.id[:8]} booted Linux 5.10.198-fc ({sb.vcpu_count} vCPU, {sb.mem_size_mb}MB RAM)",
        },
        {
            "time": "00:00:00.118",
            "type": "system",
            "text": "[KVM] Chroot jailer & seccomp-bpf active. vsock bridge ready on cid 3:1024",
        },
        {
            "time": "00:00:00.215",
            "type": "system",
            "text": "[GATEWAY] LLM metering proxy listening on 127.0.0.1:8080 (AES-256 key injection)",
        },
    ]
    if sb.state == SandboxState.FROZEN:
        initial.extend(
            [
                {
                    "time": "00:00:01.104",
                    "type": "agent",
                    "text": "[AGENT] Executing rogue_agent.py -> looping POST /v1/chat/completions",
                },
                {
                    "time": "00:00:02.410",
                    "type": "gateway",
                    "text": f"[GATEWAY] Metered {sb.total_tokens:,} tokens (${sb.total_cost_usd:.4f} USD)",
                },
                {
                    "time": "00:00:02.452",
                    "type": "killswitch",
                    "text": f"⚡ [KILLSWITCH TRIPPED] {sb.trip_reason or 'Cost cap exceeded'}",
                },
                {
                    "time": "00:00:02.494",
                    "type": "killswitch",
                    "text": f"🔒 [ENFORCEMENT] MicroVM PAUSED via KVM API in {sb.trip_to_pause_latency_ms or 42.4:.1f}ms",
                },
            ]
        )
    elif sb.state == SandboxState.RUNNING:
        initial.append(
            {
                "time": "00:00:00.510",
                "type": "success",
                "text": "MicroVM ready. Click 'Run Rogue Agent' or type 'help' in the terminal below.",
            }
        )
    _logs_store[sb.id] = initial
    return list(initial)


def get_logs(sandbox_id: str) -> list[dict[str, str]]:
    sb = store.get_sandbox(sandbox_id)
    if sb:
        return ensure_default_logs(sb)
    return list(_logs_store.get(sandbox_id, []))


async def get_live_meters(sb: Sandbox) -> dict[str, Any]:
    redis = await get_redis()
    raw = await redis.hgetall(sandbox_meters_key(sb.id))
    cost = float(raw.get("cost_usd", sb.total_cost_usd))
    tokens = int(float(raw.get("tokens", sb.total_tokens)))
    requests = int(float(raw.get("requests", sb.total_requests)))
    cpu_seconds = float(raw.get("cpu_seconds", 0.0 if sb.state != SandboxState.RUNNING else 1.85))
    memory_mb = float(
        raw.get(
            "memory_mb",
            0.0 if sb.state in (SandboxState.STOPPED, SandboxState.DESTROYED) else min(sb.mem_size_mb, 318.0),
        )
    )
    tpm = float(raw.get("tokens_per_minute", 1420.0 if sb.state == SandboxState.RUNNING else 0.0))
    rpm = float(raw.get("requests_per_minute", 12.0 if sb.state == SandboxState.RUNNING else 0.0))

    wallclock = 0.0
    if sb.started_at:
        end_dt = sb.frozen_at if sb.state == SandboxState.FROZEN and sb.frozen_at else datetime.now(UTC)
        wallclock = max(0.0, (end_dt - sb.started_at).total_seconds())

    return {
        "sandbox_id": sb.id,
        "state": sb.state.value,
        "cost_usd": round(cost, 4),
        "tokens": tokens,
        "requests": requests,
        "tokens_per_minute": tpm,
        "requests_per_minute": rpm,
        "cpu_seconds": round(cpu_seconds, 2),
        "wallclock_seconds": round(wallclock, 1),
        "memory_mb": round(memory_mb, 1),
        "trip_reason": sb.trip_reason,
        "trip_to_pause_latency_ms": sb.trip_to_pause_latency_ms,
    }


async def boot_sandbox(sb: Sandbox) -> None:
    await append_log(
        sb.id,
        f"[FIRECRACKER] Spawning microVM {sb.vm_id or sb.id[:8]} from Linux 5.10.198 kernel...",
        "system",
    )
    await append_log(
        sb.id,
        f"[KVM] Initializing {sb.vcpu_count} vCPUs, {sb.mem_size_mb}MB RAM, chroot jailer, seccomp-bpf...",
        "system",
    )
    await append_log(
        sb.id,
        "[GATEWAY] LLM metering proxy attached on 127.0.0.1:8080. vsock:cid 3:1024 active.",
        "success",
    )
    redis = await get_redis()
    await redis.hset(
        sandbox_meters_key(sb.id),
        mapping={
            "cost_usd": sb.total_cost_usd,
            "tokens": sb.total_tokens,
            "requests": sb.total_requests,
            "cpu_seconds": 0.4,
            "memory_mb": min(sb.mem_size_mb, 284.0),
            "tokens_per_minute": 0.0,
            "requests_per_minute": 0.0,
        },
    )
    await redis.hset(sandbox_state_key(sb.id), mapping={"state": SandboxState.RUNNING.value})


def cancel_workload(sandbox_id: str) -> None:
    task = _active_tasks.pop(sandbox_id, None)
    if task and not task.done():
        task.cancel()


async def start_workload(
    sandbox_id: str,
    scenario: str = "loop",
    custom_cost_cap: float | None = None,
) -> None:
    cancel_workload(sandbox_id)
    sb = store.get_sandbox(sandbox_id)
    if not sb or sb.state != SandboxState.RUNNING:
        return

    ensure_default_logs(sb)
    policy = store.get_policy(sb.policy_id) if sb.policy_id else None
    cost_cap = custom_cost_cap if custom_cost_cap is not None else (policy.max_cost_usd if policy and policy.max_cost_usd else 0.01)

    if custom_cost_cap is not None and policy and custom_cost_cap != policy.max_cost_usd:
        store.update_policy_fields(policy.id, sb.owner_id, max_cost_usd=custom_cost_cap)

    async def _runner() -> None:
        try:
            script_name = {
                "loop": "rogue_agent.py",
                "burst": "batch_scraper_agent.py",
                "safe": "unit_test_writer.py",
            }.get(scenario, "rogue_agent.py")
            task_desc = {
                "loop": 'Task "Refactor auth module (recursive retry bug)"',
                "burst": 'Task "Generate 50 unit tests concurrently"',
                "safe": 'Task "Write bounded API health check"',
            }.get(scenario, 'Task "Autonomous agent run"')

            await append_log(
                sandbox_id,
                f"[AGENT] Executing {script_name} ({task_desc}) | Killswitch cap: ${cost_cap:.4f}",
                "agent",
            )

            step = 0
            redis = await get_redis()
            while True:
                await asyncio.sleep(0.9)
                current_sb = store.get_sandbox(sandbox_id)
                if not current_sb or current_sb.state != SandboxState.RUNNING:
                    return

                step += 1
                if scenario == "burst":
                    added_reqs = 2
                    added_tokens = random.randint(1050, 1280)
                    added_cost = round(cost_cap * 0.48, 4)
                    added_cost = max(added_cost, 0.0045)
                elif scenario == "safe":
                    added_reqs = 1
                    added_tokens = random.randint(180, 240)
                    added_cost = round(min(0.0012, cost_cap * 0.15), 4)
                else:
                    # Infinite loop scenario scaled sensibly so even raised caps demonstrate protection within ~4-6 ticks or realistic step
                    added_reqs = 1
                    added_tokens = random.randint(360, 440)
                    base_step_cost = max(0.0028, round(cost_cap / 3.5, 4))
                    added_cost = base_step_cost

                new_reqs = current_sb.total_requests + added_reqs
                new_tokens = current_sb.total_tokens + added_tokens
                new_cost = round(current_sb.total_cost_usd + added_cost, 4)
                cpu_s = round(0.4 + step * 0.35, 2)
                mem_mb = round(min(current_sb.mem_size_mb, 290.0 + step * 18.0 + random.uniform(0, 12)), 1)
                tpm = float(added_tokens * 22)
                rpm = float(added_reqs * 24)

                store.update_sandbox(
                    sandbox_id,
                    total_requests=new_reqs,
                    total_tokens=new_tokens,
                    total_cost_usd=new_cost,
                )

                await redis.hset(
                    sandbox_meters_key(sandbox_id),
                    mapping={
                        "cost_usd": new_cost,
                        "tokens": new_tokens,
                        "requests": new_reqs,
                        "cpu_seconds": cpu_s,
                        "memory_mb": mem_mb,
                        "tokens_per_minute": tpm,
                        "requests_per_minute": rpm,
                    },
                )

                updated_sb = store.get_sandbox(sandbox_id)
                if updated_sb:
                    meters_payload = await get_live_meters(updated_sb)
                    evt = SandboxEvent(
                        type="meters",
                        sandbox_id=sandbox_id,
                        timestamp=datetime.now(UTC),
                        payload=meters_payload,
                    )
                    await redis.publish(sandbox_pubsub_channel(sandbox_id), evt.model_dump_json())

                await append_log(
                    sandbox_id,
                    f"[AGENT] Outbound POST /v1/chat/completions (gpt-4o) [call #{new_reqs}]",
                    "agent",
                )
                await append_log(
                    sandbox_id,
                    f"[GATEWAY] Intercepted call #{new_reqs}: +{added_tokens} tokens | Spend: ${new_cost:.4f} / ${cost_cap:.4f}",
                    "gateway",
                )

                if scenario == "loop" and step == 2:
                    await append_log(
                        sandbox_id,
                        "⚠️ [LOOP DETECTION] Identical prompt hash repeated within sliding window",
                        "warning",
                    )

                if scenario in ("loop", "burst") and new_cost >= cost_cap:
                    latency = round(38.0 + random.uniform(2.0, 9.5), 1)
                    reason = f"Cost cap exceeded (${new_cost:.4f} >= ${cost_cap:.4f})"
                    store.update_sandbox(
                        sandbox_id,
                        state=SandboxState.FROZEN,
                        frozen_at=datetime.now(UTC),
                        trip_reason=reason,
                        trip_metric_value=new_cost,
                        trip_to_pause_latency_ms=latency,
                    )
                    store.add_audit_event(
                        AuditEventType.KILLSWITCH_TRIPPED,
                        sandbox_id=sandbox_id,
                        user_id=current_sb.owner_id,
                        payload={"reason": reason, "cost_usd": new_cost, "latency_ms": latency},
                        ip_address="127.0.0.1",
                    )
                    await append_log(
                        sandbox_id,
                        f"⚡ [KILLSWITCH TRIPPED] {reason}",
                        "killswitch",
                    )
                    await append_log(
                        sandbox_id,
                        f"🔒 [ENFORCEMENT] Firecracker microVM PAUSED via KVM API in {latency:.1f}ms. Egress blocked.",
                        "killswitch",
                    )
                    await redis.hset(sandbox_state_key(sandbox_id), mapping={"state": "FROZEN"})
                    trip_evt = SandboxEvent(
                        type="killswitch_tripped",
                        sandbox_id=sandbox_id,
                        timestamp=datetime.now(UTC),
                        payload={
                            "state": "FROZEN",
                            "reason": reason,
                            "trip_to_pause_latency_ms": latency,
                        },
                    )
                    await redis.publish(sandbox_pubsub_channel(sandbox_id), trip_evt.model_dump_json())
                    return

                if scenario == "safe" and step >= 3:
                    await append_log(
                        sandbox_id,
                        f"✅ [SUCCESS] Safe agent finished 3 tool steps within budget (${new_cost:.4f} < ${cost_cap:.4f}).",
                        "success",
                    )
                    return
        except asyncio.CancelledError:
            return

    _active_tasks[sandbox_id] = asyncio.create_task(_runner())


async def exec_command(sandbox_id: str, command: str) -> list[dict[str, str]]:
    sb = store.get_sandbox(sandbox_id)
    if not sb:
        raise ValueError("Sandbox not found")

    ensure_default_logs(sb)
    trimmed = command.strip()
    output_entries: list[dict[str, str]] = []

    output_entries.append(await append_log(sandbox_id, f"$ {trimmed}", "cmd"))

    if sb.state == SandboxState.FROZEN:
        output_entries.append(
            await append_log(
                sandbox_id,
                "⚡ Sandbox is FROZEN by cost-cap killswitch. Raise cap and click 'Resume VM' (or run `sandboxctl resume`) to continue.",
                "warning",
            )
        )
        return output_entries

    lower = trimmed.lower()
    if lower == "clear":
        _logs_store[sandbox_id] = []
        return []
    elif lower == "help":
        lines = [
            "Available Firecracker MicroVM commands:",
            "  status            - Inspect hypervisor KVM state, policy limit & spend",
            "  ps / ps aux       - List running processes inside guest Linux namespace",
            "  uname -a          - Inspect Firecracker reference kernel version",
            "  free -m           - Check Linux cgroup v2 memory allocation",
            "  cat rogue_agent.py - View the simulated autonomous agent script",
            "  python rogue_agent.py - Run rogue infinite loop inside this microVM",
            "  clear             - Clear terminal scrollback",
        ]
        for line in lines:
            output_entries.append(await append_log(sandbox_id, line, "system"))
    elif lower == "status":
        pol = store.get_policy(sb.policy_id) if sb.policy_id else None
        cap_str = f"${pol.max_cost_usd:.4f}" if pol and pol.max_cost_usd else "$0.5000"
        lines = [
            f"● Firecracker MicroVM Status ({sb.name} / {sb.id})",
            f"  Hypervisor:  AWS Firecracker v1.7.0 (/dev/kvm)",
            f"  vCPUs / RAM: {sb.vcpu_count} Cores / {sb.mem_size_mb} MB (cgroup v2)",
            f"  Spend / Cap: ${sb.total_cost_usd:.4f} / {cap_str} USD ({sb.total_tokens:,} tokens)",
            f"  Gateway:     127.0.0.1:8080 (AES-256-GCM injected keys)",
            f"  State:       {sb.state.value}",
        ]
        for line in lines:
            output_entries.append(await append_log(sandbox_id, line, "gateway"))
    elif lower in ("ps", "ps aux"):
        lines = [
            "USER       PID %CPU %MEM COMMAND",
            "root         1  0.0  0.1 /init",
            "root        42  0.1  0.8 /bin/guest-agent --vsock 1024",
            "agent      108  1.2  2.4 /bin/bash",
        ]
        for line in lines:
            output_entries.append(await append_log(sandbox_id, line, "agent"))
    elif lower in ("uname", "uname -a"):
        output_entries.append(
            await append_log(
                sandbox_id,
                "Linux firecracker-guest 5.10.198-fc #1 SMP PREEMPT x86_64 GNU/Linux",
                "system",
            )
        )
    elif lower in ("free", "free -m"):
        used = int(min(sb.mem_size_mb, 290))
        free = max(0, sb.mem_size_mb - used)
        output_entries.append(
            await append_log(
                sandbox_id,
                f"Mem: total={sb.mem_size_mb}Mi used={used}Mi free={free}Mi (cgroup hard limit)",
                "system",
            )
        )
    elif lower in ("whoami", "id"):
        output_entries.append(await append_log(sandbox_id, "uid=1000(agent) gid=1000(agent) groups=1000(agent)", "agent"))
    elif lower in ("ls", "ls -la"):
        output_entries.append(
            await append_log(sandbox_id, "rogue_agent.py   unit_test_writer.py   workspace/", "agent")
        )
    elif lower in ("cat agent.py", "cat rogue_agent.py"):
        lines = [
            "# Runs inside isolated microVM; talks only to host metering proxy",
            "import httpx",
            'client = httpx.Client(base_url="http://127.0.0.1:8080/v1")',
            "while True:  # infinite retry loop if model keeps returning same error",
            '    client.post("/chat/completions", json={"model": "gpt-4o", "prompt": "Fix bug"})',
        ]
        for line in lines:
            output_entries.append(await append_log(sandbox_id, line, "agent"))
    elif lower in ("python rogue_agent.py", "python3 rogue_agent.py", "python agent.py", "python3 agent.py"):
        await start_workload(sandbox_id, "loop")
        output_entries.append(
            await append_log(sandbox_id, "[SHELL] Launched rogue_agent.py in background inside microVM...", "success")
        )
    else:
        output_entries.append(
            await append_log(
                sandbox_id,
                f"guest-sh: executed `{trimmed}` inside chroot jail (exit code 0). Type `help` for built-in diagnostics.",
                "system",
            )
        )

    return output_entries
