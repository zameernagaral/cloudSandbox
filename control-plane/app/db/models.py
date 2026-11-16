"""Domain models & enumerations for Cloud Sandbox (SQLite-backed)."""

from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Optional


def gen_uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ── Enumerations ──────────────────────────────────────────────────────────────


class SandboxState(str, enum.Enum):
    CREATING = "CREATING"
    RUNNING = "RUNNING"
    FROZEN = "FROZEN"
    STOPPED = "STOPPED"
    DESTROYED = "DESTROYED"
    ERROR = "ERROR"


class KillswitchAction(str, enum.Enum):
    PAUSE = "pause"
    SNAPSHOT_PAUSE = "snapshot_pause"
    DESTROY = "destroy"


class AuditEventType(str, enum.Enum):
    SANDBOX_CREATED = "sandbox.created"
    SANDBOX_STARTED = "sandbox.started"
    SANDBOX_PAUSED = "sandbox.paused"
    SANDBOX_RESUMED = "sandbox.resumed"
    SANDBOX_DESTROYED = "sandbox.destroyed"
    SANDBOX_SNAPSHOTTED = "sandbox.snapshotted"
    KILLSWITCH_TRIPPED = "killswitch.tripped"
    AUTH_LOGIN = "auth.login"
    AUTH_LOGOUT = "auth.logout"
    HOST_REGISTERED = "host.registered"
    POLICY_UPDATED = "policy.updated"
    API_KEY_SET = "api_key.set"


# ── Models ────────────────────────────────────────────────────────────────────


@dataclass
class User:
    id: str = field(default_factory=gen_uuid)
    email: str = ""
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    password_hash: Optional[str] = None
    github_id: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)


@dataclass
class PasswordResetToken:
    id: str = field(default_factory=gen_uuid)
    user_id: str = ""
    token_hash: str = ""
    expires_at: datetime = field(default_factory=_utcnow)
    used: bool = False
    created_at: datetime = field(default_factory=_utcnow)


@dataclass
class RefreshToken:
    id: str = field(default_factory=gen_uuid)
    user_id: str = ""
    token_hash: str = ""
    expires_at: datetime = field(default_factory=_utcnow)
    revoked: bool = False
    created_at: datetime = field(default_factory=_utcnow)


@dataclass
class UserQuota:
    user_id: str = ""
    max_concurrent_vms: int = 20
    max_vcpu: int = 64
    max_ram_mb: int = 65536
    max_disk_gb: int = 500
    updated_at: datetime = field(default_factory=_utcnow)


@dataclass
class ApiKey:
    id: str = field(default_factory=gen_uuid)
    user_id: str = ""
    name: str = ""
    key_hash: str = ""
    key_prefix: str = ""
    is_active: bool = True
    last_used_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=_utcnow)


@dataclass
class LLMCredential:
    id: str = field(default_factory=gen_uuid)
    user_id: str = ""
    provider: str = "openai"
    encrypted_key: str = ""
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)


@dataclass
class Host:
    id: str = field(default_factory=gen_uuid)
    owner_id: str = ""
    name: str = ""
    agent_url: str = "wss://127.0.0.1:8765"
    token_hash: str = ""
    is_active: bool = True
    last_heartbeat_at: Optional[datetime] = None
    total_vcpu: int = 16
    total_ram_mb: int = 32768
    total_disk_gb: int = 500
    firecracker_version: Optional[str] = "v1.7.0 (Linux 5.10.198)"
    created_at: datetime = field(default_factory=_utcnow)


@dataclass
class Policy:
    id: str = field(default_factory=gen_uuid)
    name: str = ""
    owner_id: str = ""
    max_cost_usd: Optional[float] = None
    max_tokens: Optional[int] = None
    max_tokens_per_minute: Optional[int] = None
    max_requests_per_minute: Optional[int] = None
    max_cpu_seconds: Optional[float] = None
    max_wallclock_seconds: Optional[int] = None
    loop_detection_n: int = 5
    loop_detection_window_s: int = 60
    loop_similarity_threshold: float = 0.95
    action: KillswitchAction = KillswitchAction.PAUSE
    is_default: bool = False
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)


@dataclass
class Sandbox:
    id: str = field(default_factory=gen_uuid)
    owner_id: str = ""
    host_id: Optional[str] = None
    policy_id: Optional[str] = None
    name: str = ""
    state: SandboxState = SandboxState.CREATING
    is_demo: bool = False
    vcpu_count: int = 1
    mem_size_mb: int = 512
    vm_id: Optional[str] = None
    total_cost_usd: float = 0.0
    total_tokens: int = 0
    total_requests: int = 0
    trip_reason: Optional[str] = None
    trip_metric_value: Optional[float] = None
    trip_to_pause_latency_ms: Optional[float] = None
    scrollback_lines: int = 0
    created_at: datetime = field(default_factory=_utcnow)
    started_at: Optional[datetime] = None
    frozen_at: Optional[datetime] = None
    destroyed_at: Optional[datetime] = None


@dataclass
class AuditEvent:
    id: str = field(default_factory=gen_uuid)
    sandbox_id: Optional[str] = None
    user_id: Optional[str] = None
    event_type: AuditEventType | str = AuditEventType.SANDBOX_CREATED
    payload: Optional[dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime = field(default_factory=_utcnow)
