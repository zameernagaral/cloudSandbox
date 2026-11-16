"""Application configuration — loaded from environment variables with safe dev defaults."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv

    _root_env = Path(__file__).resolve().parents[2] / ".env"
    if _root_env.exists():
        load_dotenv(_root_env)
    load_dotenv()
except ImportError:
    pass


def _env_bool(key: str, default: bool) -> bool:
    val = os.environ.get(key)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


def _parse_origins(raw: str | None) -> list[str]:
    defaults = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
    ]
    if not raw:
        return defaults
    parsed = [o.strip() for o in raw.split(",") if o.strip()]
    return parsed or defaults


class Settings(BaseModel):
    # ── Core ──────────────────────────────────────────────────────────────────
    app_name: str = os.environ.get("APP_NAME", "Cloud Sandbox")
    environment: str = os.environ.get("ENVIRONMENT", "development")
    log_level: str = os.environ.get("LOG_LEVEL", "INFO")
    secret_key: str = os.environ.get(
        "SECRET_KEY",
        os.environ.get("JWT_SECRET_KEY", "cloud-sandbox-dev-secret-key-32-bytes-minimum-2026"),
    )
    encryption_key: str = os.environ.get("ENCRYPTION_KEY", "")
    sqlite_db_path: str = os.environ.get(
        "SQLITE_DB_PATH",
        str(Path(__file__).resolve().parents[1] / "cloud_sandbox.db"),
    )

    # ── Database / Redis URIs (kept for compatibility) ────────────────────────
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:///cloud_sandbox.db")
    redis_url: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # ── Auth ──────────────────────────────────────────────────────────────────
    jwt_algorithm: str = os.environ.get("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    refresh_token_expire_days: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    github_client_id: str = os.environ.get("GITHUB_CLIENT_ID", "")
    github_client_secret: str = os.environ.get("GITHUB_CLIENT_SECRET", "")

    # ── CORS ──────────────────────────────────────────────────────────────────
    frontend_url: str = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    allowed_origins: list[str] = Field(
        default_factory=lambda: _parse_origins(os.environ.get("ALLOWED_ORIGINS"))
    )

    # ── Host Agent ────────────────────────────────────────────────────────────
    host_agent_token: str = os.environ.get("HOST_AGENT_TOKEN", "dev-host-agent-token")
    mtls_ca_cert: str = os.environ.get("MTLS_CA_CERT", "")
    mtls_client_cert: str = os.environ.get("MTLS_CLIENT_CERT", "")
    mtls_client_key: str = os.environ.get("MTLS_CLIENT_KEY", "")

    # ── LLM Metering Gateway ──────────────────────────────────────────────────
    metering_gateway_port: int = int(os.environ.get("METERING_GATEWAY_PORT", "8888"))
    openai_api_base: str = os.environ.get("OPENAI_API_BASE", "https://api.openai.com")
    anthropic_api_base: str = os.environ.get("ANTHROPIC_API_BASE", "https://api.anthropic.com")

    # ── Demo Mode & CLI Default Key ───────────────────────────────────────────
    demo_enabled: bool = _env_bool("DEMO_ENABLED", True)
    demo_cost_cap_usd: float = float(os.environ.get("DEMO_COST_CAP_USD", "0.01"))
    default_cli_api_key: str = os.environ.get(
        "DEFAULT_CLI_API_KEY", "sk-live-cloud-sandbox-admin-key"
    )

    # ── Quotas (defaults per user) ────────────────────────────────────────────
    max_concurrent_vms: int = int(os.environ.get("MAX_CONCURRENT_VMS", "20"))
    max_vcpu_per_user: int = int(os.environ.get("MAX_VCPU_PER_USER", "64"))
    max_ram_mb_per_user: int = int(os.environ.get("MAX_RAM_MB_PER_USER", "65536"))
    max_disk_gb_per_user: int = int(os.environ.get("MAX_DISK_GB_PER_USER", "500"))

    # ── Observability ─────────────────────────────────────────────────────────
    prometheus_port: int = int(os.environ.get("PROMETHEUS_PORT", "9090"))

    # ── Killswitch ────────────────────────────────────────────────────────────
    killswitch_check_interval_ms: int = int(os.environ.get("KILLSWITCH_CHECK_INTERVAL_MS", "100"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
