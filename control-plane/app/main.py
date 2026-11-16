"""
Cloud Sandbox — Control Plane

FastAPI application entry point.
Mounts:
  - /api/v1          REST API
  - /ws/terminal/... WebSocket terminal gateway
  - /ws/events/...   WebSocket event stream
  - /metrics         Prometheus metrics
  - /internal        Host agent callbacks
"""

from __future__ import annotations

import asyncio
import logging

import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import store
from app.db.redis_client import close_redis, get_redis
from app.killswitch.monitor import run_monitor
from app.metrics import router as metrics_router
from app.middleware.request_context import RequestContextMiddleware

settings = get_settings()

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
log = logging.getLogger("cloud_sandbox.main")

# Initialize SQLite tables and seed default hosts, policies, API key & demo sandboxes immediately
store.ensure_initialized()

app = FastAPI(
    title="Cloud Sandbox API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.demo import router as demo_router
from app.api.v1.hosts import router as hosts_router
from app.api.v1.internal import router as internal_router
from app.api.v1.policies import router as policies_router
from app.api.v1.sandboxes import router as sandboxes_router
from app.api.v1.settings_routes import router as settings_router
from app.ws.events import router as events_router
from app.ws.terminal import router as terminal_router

API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(sandboxes_router, prefix=API_PREFIX)
app.include_router(policies_router, prefix=API_PREFIX)
app.include_router(hosts_router, prefix=API_PREFIX)
app.include_router(settings_router, prefix=API_PREFIX)
app.include_router(admin_router, prefix=API_PREFIX)
app.include_router(demo_router, prefix=API_PREFIX)
app.include_router(internal_router)
app.include_router(terminal_router)
app.include_router(events_router)
app.include_router(metrics_router)


@app.get("/health")
@app.get("/api/v1/health")
async def health() -> dict:
    redis = await get_redis()
    redis_ok = await redis.ping()
    return {"status": "ok", "redis": redis_ok, "db": "sqlite"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or payload",
                "details": exc.errors(),
                "request_id": request_id,
            },
        },
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    log.error("unhandled_exception path=%s error=%s request_id=%s", request.url.path, exc, request_id)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "request_id": request_id,
            },
        },
        headers={"X-Request-ID": request_id},
    )


_monitor_task: asyncio.Task[None] | None = None


@app.on_event("startup")
async def startup() -> None:
    global _monitor_task
    store.ensure_initialized()
    _monitor_task = asyncio.create_task(run_monitor())
    log.info("control_plane.started env=%s", settings.environment)


@app.on_event("shutdown")
async def shutdown() -> None:
    if _monitor_task:
        _monitor_task.cancel()
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
