"""Initial schema — all tables

Revision ID: 0001
Revises: 
Create Date: 2026-10-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("username", sa.String(64), nullable=True, unique=True),
        sa.Column("display_name", sa.String(128), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("password_hash", sa.String(256), nullable=True),
        sa.Column("github_id", sa.String(64), nullable=True, unique=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("is_admin", sa.Boolean, default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # refresh_tokens
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(256), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean, default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])

    # user_quotas
    op.create_table(
        "user_quotas",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("max_concurrent_vms", sa.Integer, default=5),
        sa.Column("max_vcpu", sa.Integer, default=20),
        sa.Column("max_ram_mb", sa.Integer, default=16384),
        sa.Column("max_disk_gb", sa.Integer, default=100),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # api_keys
    op.create_table(
        "api_keys",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("key_hash", sa.String(256), nullable=False, unique=True),
        sa.Column("key_prefix", sa.String(16), nullable=False),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # llm_credentials
    op.create_table(
        "llm_credentials",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("encrypted_key", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "provider", name="uq_llm_cred_user_provider"),
    )

    # hosts
    op.create_table(
        "hosts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("agent_url", sa.String(512), nullable=False),
        sa.Column("token_hash", sa.String(256), nullable=False),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("last_heartbeat_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_vcpu", sa.Integer, default=0),
        sa.Column("total_ram_mb", sa.Integer, default=0),
        sa.Column("total_disk_gb", sa.Integer, default=0),
        sa.Column("firecracker_version", sa.String(32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # policies
    op.create_table(
        "policies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("max_cost_usd", sa.Float, nullable=True),
        sa.Column("max_tokens", sa.BigInteger, nullable=True),
        sa.Column("max_tokens_per_minute", sa.Integer, nullable=True),
        sa.Column("max_requests_per_minute", sa.Integer, nullable=True),
        sa.Column("max_cpu_seconds", sa.Float, nullable=True),
        sa.Column("max_wallclock_seconds", sa.Integer, nullable=True),
        sa.Column("loop_detection_n", sa.Integer, default=5),
        sa.Column("loop_detection_window_s", sa.Integer, default=60),
        sa.Column("loop_similarity_threshold", sa.Float, default=0.95),
        sa.Column("action", sa.String(32), default="pause"),
        sa.Column("is_default", sa.Boolean, default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # sandboxes
    op.create_table(
        "sandboxes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("host_id", sa.String(36), sa.ForeignKey("hosts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("policy_id", sa.String(36), sa.ForeignKey("policies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("state", sa.String(32), default="CREATING"),
        sa.Column("is_demo", sa.Boolean, default=False),
        sa.Column("vcpu_count", sa.Integer, default=1),
        sa.Column("mem_size_mb", sa.Integer, default=512),
        sa.Column("vm_id", sa.String(64), nullable=True),
        sa.Column("total_cost_usd", sa.Float, default=0.0),
        sa.Column("total_tokens", sa.BigInteger, default=0),
        sa.Column("total_requests", sa.Integer, default=0),
        sa.Column("trip_reason", sa.String(256), nullable=True),
        sa.Column("trip_metric_value", sa.Float, nullable=True),
        sa.Column("trip_to_pause_latency_ms", sa.Float, nullable=True),
        sa.Column("scrollback_lines", sa.Integer, default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("frozen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("destroyed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_sandboxes_owner_state", "sandboxes", ["owner_id", "state"])

    # audit_events
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("sandbox_id", sa.String(36), sa.ForeignKey("sandboxes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("payload", sa.JSON, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_events_sandbox_id", "audit_events", ["sandbox_id"])
    op.create_index("ix_audit_events_user_id", "audit_events", ["user_id"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("sandboxes")
    op.drop_table("policies")
    op.drop_table("hosts")
    op.drop_table("llm_credentials")
    op.drop_table("api_keys")
    op.drop_table("user_quotas")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
