"""Per-user quota enforcement."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import Sandbox, SandboxState, User, UserQuota

settings = get_settings()


class QuotaExceededError(Exception):
    pass


async def check_sandbox_creation_quota(user: User, db: AsyncSession) -> None:
    """Raise QuotaExceededError if the user is at their concurrent VM limit."""
    quota_result = await db.execute(select(UserQuota).where(UserQuota.user_id == user.id))
    quota = quota_result.scalar_one_or_none()
    max_vms = quota.max_concurrent_vms if quota else settings.max_concurrent_vms

    count_result = await db.execute(
        select(func.count()).where(
            Sandbox.owner_id == user.id,
            Sandbox.state.in_([SandboxState.CREATING, SandboxState.RUNNING, SandboxState.FROZEN]),
        )
    )
    current = count_result.scalar_one()
    if current >= max_vms:
        raise QuotaExceededError(
            f"You have reached your limit of {max_vms} concurrent sandboxes. "
            "Destroy an existing sandbox to create a new one."
        )
