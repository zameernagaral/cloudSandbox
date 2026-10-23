"""Sandbox-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.db.models import KillswitchAction, SandboxState


class PolicyCreate(BaseModel):
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
    name: str | None = None  # type: ignore[assignment]


class PolicyOut(PolicyCreate):
    id: str
    owner_id: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SandboxCreate(BaseModel):
    name: str = Field(max_length=128)
    host_id: str
    policy_id: str | None = None
    vcpu_count: int = Field(1, ge=1, le=32)
    mem_size_mb: int = Field(512, ge=128, le=65536)
    is_demo: bool = False


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
    agent_url: str
    total_vcpu: int
    total_ram_mb: int
    total_disk_gb: int
    firecracker_version: str | None = None


class HostRegisterResponse(BaseModel):
    host_id: str
    token: str  # bearer token for host↔CP communication


class ResumeRequest(BaseModel):
    new_max_cost_usd: float | None = None
    new_max_tokens: int | None = None


class SandboxEvent(BaseModel):
    """Real-time event pushed to the UI."""
    type: str  # state_change | meters | log | killswitch_tripped
    sandbox_id: str
    timestamp: datetime
    payload: dict


class ApiKeyCreate(BaseModel):
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
    """Returned once on creation — includes the raw key (never stored)."""
    raw_key: str


class LLMCredentialSet(BaseModel):
    provider: str = Field(pattern="^(openai|anthropic)$")
    api_key: str = Field(min_length=10)


class LLMCredentialOut(BaseModel):
    id: str
    provider: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
