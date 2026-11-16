"""Request context middleware: Request ID injection, security headers, body size caps, and injection key sanitation."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("cloud_sandbox.request")

MAX_BODY_SIZE_BYTES = 1024 * 1024  # 1 MB


def _contains_forbidden_keys(obj: Any) -> bool:
    """Recursively checks if any dictionary key contains '$' or '.'."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if not isinstance(k, str):
                continue
            if "$" in k or "." in k:
                return True
            if _contains_forbidden_keys(v):
                return True
    elif isinstance(obj, list):
        for item in obj:
            if _contains_forbidden_keys(item):
                return True
    return False


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 1. Request ID
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id

        # 2. Body size limit and forbidden key check
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE_BYTES:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={
                    "success": False,
                    "error": {
                        "code": "PAYLOAD_TOO_LARGE",
                        "message": "Request payload exceeds 1MB limit",
                        "request_id": request_id,
                    },
                },
                headers={"X-Request-ID": request_id},
            )

        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type and request.method in ("POST", "PUT", "PATCH"):
            body_bytes = await request.body()
            if len(body_bytes) > MAX_BODY_SIZE_BYTES:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "success": False,
                        "error": {
                            "code": "PAYLOAD_TOO_LARGE",
                            "message": "Request payload exceeds 1MB limit",
                            "request_id": request_id,
                        },
                    },
                    headers={"X-Request-ID": request_id},
                )
            if body_bytes:
                try:
                    parsed = json.loads(body_bytes.decode("utf-8"))
                    if _contains_forbidden_keys(parsed):
                        return JSONResponse(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            content={
                                "success": False,
                                "error": {
                                    "code": "INVALID_KEY_OPERATOR",
                                    "message": "Input contains forbidden characters ('$' or '.') in keys",
                                    "request_id": request_id,
                                },
                            },
                            headers={"X-Request-ID": request_id},
                        )
                except Exception:
                    pass  # JSON decode errors handled downstream

        # 3. Process Request
        response = await call_next(request)

        # 4. Security Headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"

        return response
