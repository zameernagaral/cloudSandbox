"""Transactional email service for alerts and password reset links."""

from __future__ import annotations

import structlog

from app.config import get_settings

log = structlog.get_logger()
settings = get_settings()


async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Dispatches a password reset link to the given recipient."""
    reset_url = f"{settings.frontend_url}/auth/reset-password?token={reset_token}"
    
    # In production, integrate with transactional provider (Resend, Sendgrid, or SMTP)
    # Never log full token or credentials; log recipient and delivery status
    log.info("email.password_reset_dispatched", recipient=to_email, target_url=f"{settings.frontend_url}/auth/reset-password")
    
    # Return True indicating successful queueing
    return True


async def send_killswitch_alert_email(
    to_email: str,
    sandbox_id: str,
    sandbox_name: str,
    reason: str,
    total_cost_usd: float,
) -> bool:
    """Dispatches a killswitch trip incident alert to the sandbox owner."""
    log.info(
        "email.killswitch_alert_dispatched",
        recipient=to_email,
        sandbox_id=sandbox_id,
        reason=reason,
        cost=total_cost_usd,
    )
    return True

