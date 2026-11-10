"""Application configuration — loaded once at startup from environment variables."""

from __future__ import annotations

import secrets
from functools import lru_cache
from typing import Any

from pydantic import AnyHttpUrl, Field, PostgresDsn, RedisDsn, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── Core ──────────────────────────────────────────────────────────────────
    app_name: str = "Cloud Sandbox"
    environment: str = "development"
    log_level: str = "INFO"
    secret_key: str = Field(default_factory=lambda: secrets.token_hex(32))
    # 32-byte key base64-encoded used for AES-256-GCM encryption of API keys
    encryption_key: str = Field(default="")

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://sandbox:sandbox@localhost:5432/sandbox"

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Auth ──────────────────────────────────────────────────────────────────
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    github_client_id: str = ""
    github_client_secret: str = ""

    # ── CORS ──────────────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:5173"
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # ── Host Agent ────────────────────────────────────────────────────────────
    host_agent_token: str = Field(default_factory=lambda: secrets.token_hex(32))
    mtls_ca_cert: str = ""
    mtls_client_cert: str = ""
    mtls_client_key: str = ""

    # ── LLM Metering Gateway ──────────────────────────────────────────────────
    metering_gateway_port: int = 8888
    openai_api_base: str = "https://api.openai.com"
    anthropic_api_base: str = "https://api.anthropic.com"

    # ── Demo Mode ─────────────────────────────────────────────────────────────
    demo_enabled: bool = True
    demo_cost_cap_usd: float = 0.01

    # ── Quotas (defaults per user) ────────────────────────────────────────────
    max_concurrent_vms: int = 5
    max_vcpu_per_user: int = 20
    max_ram_mb_per_user: int = 16384
    max_disk_gb_per_user: int = 100

    # ── Observability ─────────────────────────────────────────────────────────
    prometheus_port: int = 9090

    # ── Killswitch ────────────────────────────────────────────────────────────
    killswitch_check_interval_ms: int = 100

    @model_validator(mode="after")
    def validate_production_secrets(self) -> Self:
        if self.environment == "production":
            if not self.encryption_key:
                raise ValueError("ENCRYPTION_KEY must be provided in production")
            if not self.secret_key or len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
