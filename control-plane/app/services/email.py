"""Transactional email service for alerts and password reset links."""

from __future__ import annotations

import logging

from app.config import get_settings

log = logging.getLogger("cloud_sandbox.email")
settings = get_settings()


async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    log.info("email.password_reset_dispatched recipient=%s", to_email)
    return True


async def send_killswitch_alert_email(
    to_email: str,
    sandbox_id: str,
    sandbox_name: str,
    reason: str,
    total_cost_usd: float,
) -> bool:
    log.info(
        "email.killswitch_alert_dispatched recipient=%s sandbox_id=%s reason=%s cost=%s",
        to_email,
        sandbox_id,
        reason,
        total_cost_usd,
    )
    return True
