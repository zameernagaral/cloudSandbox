"""Prometheus metrics for the control plane."""

from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
from fastapi import APIRouter
from fastapi.responses import Response

registry = CollectorRegistry()

sandbox_created_total = Counter(
    "sandbox_created_total", "Total sandboxes created", registry=registry
)
sandbox_frozen_total = Counter(
    "sandbox_frozen_total", "Total killswitch trips", ["reason"], registry=registry
)
sandbox_active = Gauge(
    "sandbox_active", "Currently active (running) sandboxes", registry=registry
)
killswitch_latency_ms = Histogram(
    "killswitch_latency_ms",
    "Time from policy trip to VM pause (ms)",
    buckets=[10, 25, 50, 100, 250, 500, 1000, 2500],
    registry=registry,
)
llm_tokens_total = Counter(
    "llm_tokens_total", "Total LLM tokens processed", ["provider"], registry=registry
)
llm_cost_usd_total = Counter(
    "llm_cost_usd_total", "Total estimated LLM cost in USD", ["provider"], registry=registry
)

router = APIRouter(tags=["observability"])


@router.get("/metrics")
async def metrics() -> Response:
    return Response(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)
