"""Sandbox-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import KillswitchAction, SandboxState


class PolicyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(max_length=128)
    max_cost_usd: float | None = Field(None, gt=0)
    max_tokens: int | None = Field(None, gt=0)
    max_tokens_per_minute: int | None = Field(None, gt=0)
    max_requests_per_minute: int | None = Field(None, gt=0)
    max_cpu_seconds: float | None = Field(None, gt=0)
    max_wallclock_seconds: int | None = Field(None, gt=0)
    loop_detection_n: int = Field(5, ge=2)
    loop_detection_window_s: int = Field(60, ge=10)
    loop_similarity_threshold: float = Field(0.95, ge=0.5, le=1.0)
    action: KillswitchAction = KillswitchAction.PAUSE


class PolicyUpdate(PolicyCreate):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None  # type: ignore[assignment]


class PolicyOut(PolicyCreate):
    id: str
    owner_id: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SandboxCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(max_length=128)
    host_id: str | None = None
    policy_id: str | None = None
    vcpu_count: int = Field(2, ge=1, le=32)
    mem_size_mb: int = Field(1024, ge=128, le=65536)
    is_demo: bool = False
    scenario: str | None = None
    max_cost_usd: float | None = Field(None, gt=0)


class RunWorkloadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenario: str = Field("loop", pattern="^(loop|burst|safe)$")
    max_cost_usd: float | None = Field(None, gt=0)


class ExecCommandRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    command: str = Field(min_length=1, max_length=2000)


class SandboxOut(BaseModel):
    id: str
    owner_id: str
    host_id: str | None
    policy_id: str | None
    name: str
    state: SandboxState
    is_demo: bool
    vcpu_count: int
    mem_size_mb: int
    total_cost_usd: float
    total_tokens: int
    total_requests: int
    trip_reason: str | None
    trip_metric_value: float | None
    trip_to_pause_latency_ms: float | None
    created_at: datetime
    started_at: datetime | None
    frozen_at: datetime | None
    destroyed_at: datetime | None

    model_config = {"from_attributes": True}


class SandboxMeters(BaseModel):
    """Live meters pushed via WebSocket."""
    sandbox_id: str
    state: str
    cost_usd: float
    tokens: int
    requests: int
    tokens_per_minute: float
    requests_per_minute: float
    cpu_seconds: float
    wallclock_seconds: float
    memory_mb: float
    trip_reason: str | None = None
    trip_to_pause_latency_ms: float | None = None


class HostCreate(BaseModel):
    name: str = Field(max_length=128)
    agent_url: str = Field(max_length=512)


class HostOut(BaseModel):
    id: str
    owner_id: str
    name: str
    agent_url: str
    is_active: bool
    last_heartbeat_at: datetime | None
    total_vcpu: int
    total_ram_mb: int
    total_disk_gb: int
    firecracker_version: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class HostRegisterRequest(BaseModel):
    """Sent by sandboxctl host init to register a new host."""
    name: str
    agent_url: str = "wss://127.0.0.1:8765"
    total_vcpu: int = 8
    total_ram_mb: int = 16384
    total_disk_gb: int = 100
    firecracker_version: str | None = "v1.7.0 (Linux 5.10.198)"


class HostRegisterResponse(BaseModel):
    host_id: str
    id: str
    name: str
    token: str


class ResumeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    new_max_cost_usd: float | None = Field(None, gt=0)
    new_max_tokens: int | None = Field(None, gt=0)


class SandboxEvent(BaseModel):
    """Real-time event pushed to the UI."""
    type: str  # state_change | meters | log | killswitch_tripped
    sandbox_id: str
    timestamp: datetime
    payload: dict


class ApiKeyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(max_length=128)


class ApiKeyOut(BaseModel):
    id: str
    name: str
    key_prefix: str
    is_active: bool
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreated(ApiKeyOut):
    raw_key: str


class LLMCredentialSet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: str = Field(pattern="^(openai|anthropic)$")
    api_key: str = Field(min_length=10)


class LLMCredentialOut(BaseModel):
    id: str
    provider: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
