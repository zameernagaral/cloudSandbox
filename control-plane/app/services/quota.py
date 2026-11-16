"""Per-user quota enforcement."""

from __future__ import annotations

from app.config import get_settings
from app.db import store
from app.db.models import User

settings = get_settings()


class QuotaExceededError(Exception):
    pass


async def check_sandbox_creation_quota(user: User, db: object = None) -> None:
    """Raise QuotaExceededError if the user is at their concurrent VM limit."""
    quota = store.get_user_quota(user.id)
    max_vms = quota.max_concurrent_vms if quota else settings.max_concurrent_vms
    current = store.count_active_sandboxes(user.id)
    if current >= max_vms:
        raise QuotaExceededError(
            f"You have reached your limit of {max_vms} concurrent sandboxes. "
            "Destroy an existing sandbox to create a new one."
        )
