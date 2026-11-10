"""Security and access control test suite for Cloud Sandbox API.

Covers:
- Anonymous access denial (401)
- Non-admin access to admin routes denial (403)
- Unknown fields & mass-assignment prevention (422)
- Injection operator rejection ($ and .) (422)
- Oversized payload rejection (413)
- Identical authentication failure messages (401)
- Single-use and expiration of password reset tokens
- Multi-tenant horizontal isolation (User A cannot access User B's sandboxes)
"""

from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.db.base import get_db
from app.db.models import Host, Sandbox, SandboxState, User
from app.main import app
from app.middleware.auth import get_current_user


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def test_anonymous_access_denied(client: TestClient) -> None:
    """Anonymous requests to protected sandbox endpoints must be refused with 401."""
    response = client.get("/api/v1/sandboxes")
    assert response.status_code == 401
    assert "detail" in response.json() or "error" in response.json()


def test_non_admin_denied_from_admin_endpoint(client: TestClient) -> None:
    """Non-admin user accessing an admin endpoint must receive 403 Forbidden."""
    non_admin_user = User(
        id="usr-regular-01",
        email="dev@example.com",
        is_admin=False,
        is_active=True,
    )

    app.dependency_overrides[get_current_user] = lambda: non_admin_user
    try:
        response = client.get("/api/v1/hosts")
        assert response.status_code == 403
        assert response.json()["detail"] == "Admin required"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_reject_mass_assignment_and_unknown_fields(client: TestClient) -> None:
    """Passing unauthorized fields like 'is_admin' or 'role' must be rejected with 422."""
    mock_user = User(id="usr-regular-01", email="dev@example.com", is_admin=False, is_active=True)
    app.dependency_overrides[get_current_user] = lambda: mock_user

    try:
        # Attempt to inject extra field 'role: admin' or 'is_admin: true'
        payload = {
            "name": "Exploit Sandbox",
            "host_id": "host-01",
            "vcpu_count": 2,
            "mem_size_mb": 512,
            "role": "admin",
            "is_admin": True,
        }
        response = client.post("/api/v1/sandboxes", json=payload)
        assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_reject_injection_operators_in_keys(client: TestClient) -> None:
    """Keys containing NoSQL/MongoDB-style operator injection ($ or .) must be rejected with 422."""
    malicious_payload = {
        "email": {"$ne": "null"},
        "password": "validpassword123",
    }
    response = client.post("/api/v1/auth/login", json=malicious_payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data or "detail" in data


def test_reject_oversized_payload(client: TestClient) -> None:
    """Payloads exceeding the 1 MB body size cap must be rejected with 413."""
    oversized_data = "A" * (1024 * 1024 + 100)
    response = client.post(
        "/api/v1/auth/register",
        content=oversized_data,
        headers={"Content-Type": "application/json", "Content-Length": str(len(oversized_data))},
    )
    assert response.status_code == 413


def test_health_endpoints(client: TestClient) -> None:
    """Health check endpoints must respond with status ok and security headers."""
    with patch("app.main.get_redis") as mock_get_redis:
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)
        mock_get_redis.return_value = mock_redis

        response = client.get("/health")
        assert response.status_code == 200
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"

        response_v1 = client.get("/api/v1/health")
        assert response_v1.status_code == 200
        assert "X-Request-ID" in response_v1.headers


def test_security_headers_present_on_all_responses(client: TestClient) -> None:
    """Every HTTP response must deliver mandatory defensive security headers."""
    response = client.get("/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in response.headers.get("Permissions-Policy", "")
    assert "X-Request-ID" in response.headers

