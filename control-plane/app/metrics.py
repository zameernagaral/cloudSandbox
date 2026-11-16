"""Prometheus-compatible metrics endpoint using live SQLite stats."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import Response

from app.db import store

router = APIRouter(tags=["observability"])


@router.get("/metrics")
async def metrics() -> Response:
    stats = store.get_admin_overview_stats()
    lines = [
        "# HELP sandbox_total Total active/frozen microVM sandboxes",
        "# TYPE sandbox_total gauge",
        f"sandbox_total {stats['total_sandboxes']}",
        "# HELP sandbox_frozen_total Total killswitch frozen microVMs",
        "# TYPE sandbox_frozen_total gauge",
        f"sandbox_frozen_total {stats['breached_sandboxes']}",
        "# HELP sandbox_hosts_active Total active KVM hosts",
        "# TYPE sandbox_hosts_active gauge",
        f"sandbox_hosts_active {stats['active_hosts']}",
        "# HELP llm_cost_usd_total Total metered LLM spend in USD",
        "# TYPE llm_cost_usd_total counter",
        f"llm_cost_usd_total {stats['total_spend_usd']}",
    ]
    return Response("\n".join(lines) + "\n", media_type="text/plain; version=0.0.4")
