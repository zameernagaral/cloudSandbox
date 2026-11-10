"""Database seed script: initializes default policies, a sample host node, and an admin user.

ADMIN_EMAIL and ADMIN_PASSWORD are read from the environment.
If ADMIN_PASSWORD is not provided, a cryptographically secure 24-character password
is generated and printed once to stdout. A default password is never hardcoded.
"""

from __future__ import annotations

import asyncio
import os
import secrets
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db.base import Base
from app.db.models import Host, KillswitchAction, Policy, User, UserQuota
from app.services.auth import hash_password

settings = get_settings()


async def seed() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        # 1. Admin Account
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@cloudsandbox.io")
        admin_password = os.environ.get("ADMIN_PASSWORD")
        generated_password = None
        if not admin_password:
            generated_password = secrets.token_urlsafe(18)
            admin_password = generated_password

        admin_result = await session.execute(select(User).where(User.email == admin_email))
        admin_user = admin_result.scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                email=admin_email,
                password_hash=hash_password(admin_password),
                display_name="System Administrator",
                username="admin",
                is_admin=True,
                is_active=True,
            )
            session.add(admin_user)
            await session.flush()
            session.add(UserQuota(user_id=admin_user.id, max_concurrent_vms=20, max_vcpu=64, max_ram_mb=65536))
            print(f"[SEED] Created Admin user: {admin_email}")
            if generated_password:
                print(f"[SEED] Generated One-Time Admin Password: {generated_password}")
                print("[SEED] Please store this password securely or rotate it immediately.")
        else:
            print(f"[SEED] Admin user already exists: {admin_email}")

        # 2. Default Killswitch Policies
        policies_to_seed = [
            {
                "name": "Default Balanced",
                "max_cost_usd": 0.50,
                "max_tokens": 50000,
                "max_tokens_per_minute": 10000,
                "max_requests_per_minute": 60,
                "loop_detection_n": 5,
                "loop_detection_window_s": 60,
                "loop_similarity_threshold": 0.95,
                "action": KillswitchAction.PAUSE,
                "is_default": True,
            },
            {
                "name": "Strict Demo ($0.01 Cap)",
                "max_cost_usd": 0.01,
                "max_tokens": 1500,
                "max_tokens_per_minute": 500,
                "max_requests_per_minute": 20,
                "loop_detection_n": 3,
                "loop_detection_window_s": 30,
                "loop_similarity_threshold": 0.90,
                "action": KillswitchAction.PAUSE,
                "is_default": False,
            },
            {
                "name": "High-Throughput Dev ($5.00 Cap)",
                "max_cost_usd": 5.00,
                "max_tokens": 500000,
                "max_tokens_per_minute": 50000,
                "max_requests_per_minute": 120,
                "loop_detection_n": 8,
                "loop_detection_window_s": 60,
                "loop_similarity_threshold": 0.98,
                "action": KillswitchAction.PAUSE,
                "is_default": False,
            },
        ]

        for p_data in policies_to_seed:
            existing_p = await session.execute(
                select(Policy).where(Policy.owner_id == admin_user.id, Policy.name == p_data["name"])
            )
            if not existing_p.scalar_one_or_none():
                policy = Policy(owner_id=admin_user.id, **p_data)
                session.add(policy)
                print(f"[SEED] Created Policy: {p_data['name']}")

        # 3. Sample Bare-Metal KVM Host
        host_name = "Primary KVM Node (Ubuntu 22.04 LTS)"
        existing_host = await session.execute(
            select(Host).where(Host.owner_id == admin_user.id, Host.name == host_name)
        )
        if not existing_host.scalar_one_or_none():
            host = Host(
                owner_id=admin_user.id,
                name=host_name,
                agent_url="wss://127.0.0.1:8765",
                token_hash="stub_token_hash_for_dev_seed",
                is_active=True,
                total_vcpu=16,
                total_ram_mb=32768,
                total_disk_gb=500,
                firecracker_version="v1.7.0",
                last_heartbeat_at=datetime.now(UTC),
            )
            session.add(host)
            print(f"[SEED] Created Host Node: {host_name}")

        await session.commit()
    await engine.dispose()
    print("[SEED] Database seeding complete.")


if __name__ == "__main__":
    asyncio.run(seed())

