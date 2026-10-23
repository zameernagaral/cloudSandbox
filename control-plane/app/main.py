"""
Cloud Sandbox — Control Plane

FastAPI application entry point.
Mounts:
  - /api/v1          REST API
  - /ws/terminal/... WebSocket terminal gateway
  - /ws/events/...   WebSocket event stream
  - /metrics         Prometheus
  - /internal        Host agent callbacks (not behind public auth)
"""

from __future__ import annotations

import asyncio
import logging

import structlog
import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db.redis_client import close_redis, get_redis
from app.killswitch.monitor import run_monitor
from app.metrics import router as metrics_router

settings = get_settings()

# ── Logging ───────────────────────────────────────────────────────────────────
structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(
        logging.getLevelName(settings.log_level.upper())
    ),
)
log = structlog.get_logger()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Cloud Sandbox API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.v1.auth import router as auth_router
from app.api.v1.sandboxes import router as sandboxes_router
from app.api.v1.policies import router as policies_router
from app.api.v1.hosts import router as hosts_router
from app.api.v1.settings_routes import router as settings_router
from app.api.v1.internal import router as internal_router
from app.api.v1.demo import router as demo_router
from app.ws.terminal import router as terminal_router
from app.ws.events import router as events_router

API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(sandboxes_router, prefix=API_PREFIX)
app.include_router(policies_router, prefix=API_PREFIX)
app.include_router(hosts_router, prefix=API_PREFIX)
app.include_router(settings_router, prefix=API_PREFIX)
app.include_router(demo_router, prefix=API_PREFIX)
app.include_router(internal_router)  # No API prefix — called by host agent directly
app.include_router(terminal_router)
app.include_router(events_router)
app.include_router(metrics_router)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health() -> dict:
    redis = await get_redis()
    redis_ok = await redis.ping()
    return {"status": "ok", "redis": redis_ok}


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    log.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
    )


# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup() -> None:
    log.info("control_plane.starting", env=settings.environment)
    # Start killswitch monitor as background task
    asyncio.create_task(run_monitor())
    log.info("control_plane.started")


@app.on_event("shutdown")
async def shutdown() -> None:
    await close_redis()
    log.info("control_plane.stopped")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
