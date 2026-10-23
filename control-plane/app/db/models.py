"""SQLAlchemy ORM models — the single source of truth for the database schema."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


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


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    github_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    sandboxes: Mapped[list[Sandbox]] = relationship("Sandbox", back_populates="owner")
    hosts: Mapped[list[Host]] = relationship("Host", back_populates="owner")
    api_keys: Mapped[list[ApiKey]] = relationship("ApiKey", back_populates="user")
    llm_credentials: Mapped[list[LLMCredential]] = relationship(
        "LLMCredential", back_populates="user"
    )
    refresh_tokens: Mapped[list[RefreshToken]] = relationship("RefreshToken", back_populates="user")
    quota: Mapped[Optional[UserQuota]] = relationship("UserQuota", back_populates="user", uselist=False)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")


class UserQuota(Base):
    __tablename__ = "user_quotas"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    max_concurrent_vms: Mapped[int] = mapped_column(Integer, default=5)
    max_vcpu: Mapped[int] = mapped_column(Integer, default=20)
    max_ram_mb: Mapped[int] = mapped_column(Integer, default=16384)
    max_disk_gb: Mapped[int] = mapped_column(Integer, default=100)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship("User", back_populates="quota")


class ApiKey(Base):
    """User-issued API keys for programmatic access (CLI, etc.)."""

    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)  # for display
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship("User", back_populates="api_keys")


class LLMCredential(Base):
    """Encrypted LLM API keys stored per-user. Never exposed to VMs."""

    __tablename__ = "llm_credentials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # openai | anthropic
    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)  # AES-256-GCM ciphertext
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship("User", back_populates="llm_credentials")

    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_llm_cred_user_provider"),)


class Host(Base):
    """A KVM-enabled machine registered by the user."""

    __tablename__ = "hosts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    agent_url: Mapped[str] = mapped_column(String(512), nullable=False)  # wss://host:8765
    token_hash: Mapped[str] = mapped_column(String(256), nullable=False)  # mTLS fallback token
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_heartbeat_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Capabilities reported by agent
    total_vcpu: Mapped[int] = mapped_column(Integer, default=0)
    total_ram_mb: Mapped[int] = mapped_column(Integer, default=0)
    total_disk_gb: Mapped[int] = mapped_column(Integer, default=0)
    firecracker_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped[User] = relationship("User", back_populates="hosts")
    sandboxes: Mapped[list[Sandbox]] = relationship("Sandbox", back_populates="host")


class Policy(Base):
    """Killswitch policy — per-sandbox cost and execution limits."""

    __tablename__ = "policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # Cost limits
    max_cost_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_tokens: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    max_tokens_per_minute: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_requests_per_minute: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Compute limits
    max_cpu_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_wallclock_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Loop detection
    loop_detection_n: Mapped[int] = mapped_column(Integer, default=5)
    loop_detection_window_s: Mapped[int] = mapped_column(Integer, default=60)
    loop_similarity_threshold: Mapped[float] = mapped_column(Float, default=0.95)
    # Action on trip
    action: Mapped[KillswitchAction] = mapped_column(
        Enum(KillswitchAction), default=KillswitchAction.PAUSE
    )
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    sandboxes: Mapped[list[Sandbox]] = relationship("Sandbox", back_populates="policy")


class Sandbox(Base):
    """A microVM sandbox instance."""

    __tablename__ = "sandboxes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    host_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("hosts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    policy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("policies.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    state: Mapped[SandboxState] = mapped_column(
        Enum(SandboxState), default=SandboxState.CREATING, index=True
    )
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    # Firecracker VM config
    vcpu_count: Mapped[int] = mapped_column(Integer, default=1)
    mem_size_mb: Mapped[int] = mapped_column(Integer, default=512)
    vm_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # firecracker VM id
    # Metering totals (also in Redis for speed; synced periodically)
    total_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    total_tokens: Mapped[int] = mapped_column(BigInteger, default=0)
    total_requests: Mapped[int] = mapped_column(Integer, default=0)
    # Killswitch trip info
    trip_reason: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    trip_metric_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    trip_to_pause_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # Terminal scrollback (last N lines stored in Postgres; full in Redis)
    scrollback_lines: Mapped[int] = mapped_column(Integer, default=0)
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    frozen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    destroyed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped[User] = relationship("User", back_populates="sandboxes")
    host: Mapped[Optional[Host]] = relationship("Host", back_populates="sandboxes")
    policy: Mapped[Optional[Policy]] = relationship("Policy", back_populates="sandboxes")
    audit_events: Mapped[list[AuditEvent]] = relationship("AuditEvent", back_populates="sandbox")

    __table_args__ = (Index("ix_sandboxes_owner_state", "owner_id", "state"),)


class AuditEvent(Base):
    """Immutable audit log of all significant system events."""

    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    sandbox_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("sandboxes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_type: Mapped[AuditEventType] = mapped_column(Enum(AuditEventType), nullable=False)
    payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    sandbox: Mapped[Optional[Sandbox]] = relationship("Sandbox", back_populates="audit_events")
