"""Persistent SQLite database store for Cloud Sandbox."""

from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
import uuid
from datetime import UTC, datetime
from typing import Any, Optional

from app.config import get_settings
from app.db.models import (
    ApiKey,
    AuditEvent,
    AuditEventType,
    Host,
    KillswitchAction,
    LLMCredential,
    PasswordResetToken,
    Policy,
    RefreshToken,
    Sandbox,
    SandboxState,
    User,
    UserQuota,
)
from app.services.passwords import hash_password

_lock = threading.RLock()
_conn: sqlite3.Connection | None = None
_initialized = False


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _parse_dt(val: Optional[str]) -> Optional[datetime]:
    if not val:
        return None
    try:
        dt = datetime.fromisoformat(val)
        return dt if dt.tzinfo else dt.replace(tzinfo=UTC)
    except Exception:
        return datetime.now(UTC)


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        settings = get_settings()
        _conn = sqlite3.connect(settings.sqlite_db_path, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA foreign_keys=ON")
    return _conn


def ensure_initialized() -> None:
    global _initialized
    if _initialized:
        return
    with _lock:
        if _initialized:
            return
        init_db()
        seed_defaults()
        _initialized = True


def init_db() -> None:
    with _lock:
        conn = _get_conn()
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE,
                display_name TEXT,
                avatar_url TEXT,
                password_hash TEXT,
                github_id TEXT UNIQUE,
                is_active INTEGER DEFAULT 1,
                is_admin INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_quotas (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                max_concurrent_vms INTEGER DEFAULT 20,
                max_vcpu INTEGER DEFAULT 64,
                max_ram_mb INTEGER DEFAULT 65536,
                max_disk_gb INTEGER DEFAULT 500,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                revoked INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                used INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                key_hash TEXT UNIQUE NOT NULL,
                key_prefix TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                last_used_at TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS llm_credentials (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                provider TEXT NOT NULL,
                encrypted_key TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, provider)
            );

            CREATE TABLE IF NOT EXISTS hosts (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                agent_url TEXT NOT NULL,
                token_hash TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                last_heartbeat_at TEXT,
                total_vcpu INTEGER DEFAULT 16,
                total_ram_mb INTEGER DEFAULT 32768,
                total_disk_gb INTEGER DEFAULT 500,
                firecracker_version TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS policies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                max_cost_usd REAL,
                max_tokens INTEGER,
                max_tokens_per_minute INTEGER,
                max_requests_per_minute INTEGER,
                max_cpu_seconds REAL,
                max_wallclock_seconds INTEGER,
                loop_detection_n INTEGER DEFAULT 5,
                loop_detection_window_s INTEGER DEFAULT 60,
                loop_similarity_threshold REAL DEFAULT 0.95,
                action TEXT DEFAULT 'pause',
                is_default INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sandboxes (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                host_id TEXT REFERENCES hosts(id) ON DELETE SET NULL,
                policy_id TEXT REFERENCES policies(id) ON DELETE SET NULL,
                name TEXT NOT NULL,
                state TEXT NOT NULL DEFAULT 'CREATING',
                is_demo INTEGER DEFAULT 0,
                vcpu_count INTEGER DEFAULT 2,
                mem_size_mb INTEGER DEFAULT 1024,
                vm_id TEXT,
                total_cost_usd REAL DEFAULT 0.0,
                total_tokens INTEGER DEFAULT 0,
                total_requests INTEGER DEFAULT 0,
                trip_reason TEXT,
                trip_metric_value REAL,
                trip_to_pause_latency_ms REAL,
                scrollback_lines INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                started_at TEXT,
                frozen_at TEXT,
                destroyed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY,
                sandbox_id TEXT REFERENCES sandboxes(id) ON DELETE SET NULL,
                user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                event_type TEXT NOT NULL,
                payload TEXT,
                ip_address TEXT,
                created_at TEXT NOT NULL
            );
            """
        )
        conn.commit()


def _row_to_user(row: sqlite3.Row) -> User:
    return User(
        id=row["id"],
        email=row["email"],
        username=row["username"],
        display_name=row["display_name"],
        avatar_url=row["avatar_url"],
        password_hash=row["password_hash"],
        github_id=row["github_id"],
        is_active=bool(row["is_active"]),
        is_admin=bool(row["is_admin"]),
        created_at=_parse_dt(row["created_at"]) or datetime.now(UTC),
        updated_at=_parse_dt(row["updated_at"]) or datetime.now(UTC),
    )


def _row_to_host(row: sqlite3.Row) -> Host:
    return Host(
        id=row["id"],
        owner_id=row["owner_id"],
        name=row["name"],
        agent_url=row["agent_url"],
        token_hash=row["token_hash"],
        is_active=bool(row["is_active"]),
        last_heartbeat_at=_parse_dt(row["last_heartbeat_at"]),
        total_vcpu=row["total_vcpu"],
        total_ram_mb=row["total_ram_mb"],
        total_disk_gb=row["total_disk_gb"],
        firecracker_version=row["firecracker_version"],
        created_at=_parse_dt(row["created_at"]) or datetime.now(UTC),
    )


def _row_to_policy(row: sqlite3.Row) -> Policy:
    return Policy(
        id=row["id"],
        name=row["name"],
        owner_id=row["owner_id"],
        max_cost_usd=row["max_cost_usd"],
        max_tokens=row["max_tokens"],
        max_tokens_per_minute=row["max_tokens_per_minute"],
        max_requests_per_minute=row["max_requests_per_minute"],
        max_cpu_seconds=row["max_cpu_seconds"],
        max_wallclock_seconds=row["max_wallclock_seconds"],
        loop_detection_n=row["loop_detection_n"],
        loop_detection_window_s=row["loop_detection_window_s"],
        loop_similarity_threshold=row["loop_similarity_threshold"],
        action=KillswitchAction(row["action"]),
        is_default=bool(row["is_default"]),
        created_at=_parse_dt(row["created_at"]) or datetime.now(UTC),
        updated_at=_parse_dt(row["updated_at"]) or datetime.now(UTC),
    )


def _row_to_sandbox(row: sqlite3.Row) -> Sandbox:
    return Sandbox(
        id=row["id"],
        owner_id=row["owner_id"],
        host_id=row["host_id"],
        policy_id=row["policy_id"],
        name=row["name"],
        state=SandboxState(row["state"]),
        is_demo=bool(row["is_demo"]),
        vcpu_count=row["vcpu_count"],
        mem_size_mb=row["mem_size_mb"],
        vm_id=row["vm_id"],
        total_cost_usd=row["total_cost_usd"],
        total_tokens=row["total_tokens"],
        total_requests=row["total_requests"],
        trip_reason=row["trip_reason"],
        trip_metric_value=row["trip_metric_value"],
        trip_to_pause_latency_ms=row["trip_to_pause_latency_ms"],
        scrollback_lines=row["scrollback_lines"],
        created_at=_parse_dt(row["created_at"]) or datetime.now(UTC),
        started_at=_parse_dt(row["started_at"]),
        frozen_at=_parse_dt(row["frozen_at"]),
        destroyed_at=_parse_dt(row["destroyed_at"]),
    )


def _row_to_api_key(row: sqlite3.Row) -> ApiKey:
    return ApiKey(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        key_hash=row["key_hash"],
        key_prefix=row["key_prefix"],
        is_active=bool(row["is_active"]),
        last_used_at=_parse_dt(row["last_used_at"]),
        created_at=_parse_dt(row["created_at"]) or datetime.now(UTC),
    )


def _row_to_llm_cred(row: sqlite3.Row) -> LLMCredential:
    return LLMCredential(
        id=row["id"],
        user_id=row["user_id"],
        provider=row["provider"],
        encrypted_key=row["encrypted_key"],
        created_at=_parse_dt(row["created_at"]) or datetime.now(UTC),
        updated_at=_parse_dt(row["updated_at"]) or datetime.now(UTC),
    )


def _row_to_audit(row: sqlite3.Row) -> AuditEvent:
    payload = None
    if row["payload"]:
        try:
            payload = json.loads(row["payload"])
        except Exception:
            payload = None
    return AuditEvent(
        id=row["id"],
        sandbox_id=row["sandbox_id"],
        user_id=row["user_id"],
        event_type=row["event_type"],
        payload=payload,
        ip_address=row["ip_address"],
        created_at=_parse_dt(row["created_at"]) or datetime.now(UTC),
    )


def provision_user_defaults(user_id: str) -> None:
    """Create default quota, KVM host node, and starter policies for a newly created user."""
    with _lock:
        conn = _get_conn()
        now = _now_iso()
        conn.execute(
            "INSERT OR IGNORE INTO user_quotas (user_id, max_concurrent_vms, max_vcpu, max_ram_mb, max_disk_gb, updated_at) VALUES (?, 20, 64, 65536, 500, ?)",
            (user_id, now),
        )
        host_count = conn.execute("SELECT COUNT(*) FROM hosts WHERE owner_id = ?", (user_id,)).fetchone()[0]
        if host_count == 0:
            conn.execute(
                """INSERT INTO hosts (id, owner_id, name, agent_url, token_hash, is_active, last_heartbeat_at, total_vcpu, total_ram_mb, total_disk_gb, firecracker_version, created_at)
                   VALUES (?, ?, ?, ?, ?, 1, ?, 16, 32768, 500, ?, ?)""",
                (
                    f"host-{uuid.uuid4().hex[:8]}",
                    user_id,
                    "Primary KVM Node (Ubuntu 22.04 LTS)",
                    "wss://127.0.0.1:8765",
                    hashlib.sha256(b"dev-host").hexdigest(),
                    now,
                    "v1.7.0 (Linux 5.10.198)",
                    now,
                ),
            )
        pol_count = conn.execute("SELECT COUNT(*) FROM policies WHERE owner_id = ?", (user_id,)).fetchone()[0]
        if pol_count == 0:
            defaults = [
                ("Strict Demo ($0.01 Cap)", 0.01, 1500, 3, 30, 1),
                ("Developer Balanced ($0.50 Cap)", 0.50, 50000, 5, 60, 0),
                ("High-Throughput ($5.00 Cap)", 5.00, 500000, 8, 60, 0),
            ]
            for name, cost, tokens, loop_n, loop_w, is_def in defaults:
                conn.execute(
                    """INSERT INTO policies (id, name, owner_id, max_cost_usd, max_tokens, max_tokens_per_minute, max_requests_per_minute, loop_detection_n, loop_detection_window_s, action, is_default, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, 10000, 60, ?, ?, 'pause', ?, ?, ?)""",
                    (f"pol-{uuid.uuid4().hex[:8]}", name, user_id, cost, tokens, loop_n, loop_w, is_def, now, now),
                )
        conn.commit()


def seed_defaults() -> None:
    settings = get_settings()
    with _lock:
        conn = _get_conn()
        now = _now_iso()

        # 1. Seed primary student/demo admin user
        existing_student = conn.execute("SELECT id FROM users WHERE id = ?", ("usr-student-01",)).fetchone()
        if not existing_student:
            conn.execute(
                """INSERT INTO users (id, email, username, display_name, password_hash, is_active, is_admin, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)""",
                (
                    "usr-student-01",
                    "student.cse@campus.edu",
                    "student_dev",
                    "Zameer (Sandbox Admin)",
                    hash_password("sandbox12345"),
                    now,
                    now,
                ),
            )
            conn.execute(
                "INSERT OR IGNORE INTO user_quotas (user_id, max_concurrent_vms, max_vcpu, max_ram_mb, max_disk_gb, updated_at) VALUES (?, 20, 64, 65536, 500, ?)",
                ("usr-student-01", now),
            )

        # 2. Seed secondary admin@cloudsandbox.io user
        existing_admin = conn.execute("SELECT id FROM users WHERE email = ?", ("admin@cloudsandbox.io",)).fetchone()
        if not existing_admin:
            conn.execute(
                """INSERT INTO users (id, email, username, display_name, password_hash, is_active, is_admin, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)""",
                (
                    "usr-admin-01",
                    "admin@cloudsandbox.io",
                    "admin",
                    "System Administrator",
                    hash_password("admin12345"),
                    now,
                    now,
                ),
            )
            conn.execute(
                "INSERT OR IGNORE INTO user_quotas (user_id, max_concurrent_vms, max_vcpu, max_ram_mb, max_disk_gb, updated_at) VALUES (?, 20, 64, 65536, 500, ?)",
                ("usr-admin-01", now),
            )

        # 3. Seed default CLI / Demo API Key mapped to usr-student-01
        raw_cli_key = settings.default_cli_api_key
        cli_key_hash = hashlib.sha256(raw_cli_key.encode()).hexdigest()
        existing_key = conn.execute("SELECT id FROM api_keys WHERE key_hash = ?", (cli_key_hash,)).fetchone()
        if not existing_key:
            conn.execute(
                """INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, is_active, created_at)
                   VALUES (?, ?, ?, ?, ?, 1, ?)""",
                (
                    "key-cli-default",
                    "usr-student-01",
                    "Default Workstation CLI Key",
                    cli_key_hash,
                    raw_cli_key[:12],
                    now,
                ),
            )

        # 4. Seed default KVM Host for usr-student-01
        existing_host = conn.execute("SELECT id FROM hosts WHERE id = ?", ("host-01",)).fetchone()
        if not existing_host:
            conn.execute(
                """INSERT INTO hosts (id, owner_id, name, agent_url, token_hash, is_active, last_heartbeat_at, total_vcpu, total_ram_mb, total_disk_gb, firecracker_version, created_at)
                   VALUES (?, ?, ?, ?, ?, 1, ?, 16, 32768, 500, ?, ?)""",
                (
                    "host-01",
                    "usr-student-01",
                    "Primary KVM Node (Ubuntu 22.04 LTS)",
                    "wss://127.0.0.1:8765",
                    hashlib.sha256(b"host-01-token").hexdigest(),
                    now,
                    "v1.7.0 (Linux 5.10.198)",
                    now,
                ),
            )

        # 5. Seed starter Killswitch Policies for usr-student-01
        starter_policies = [
            ("pol-cost-cap", "Strict Demo ($0.01 Cap)", 0.01, 1500, 3, 30, 1),
            ("pol-standard", "Developer Balanced ($0.50 Cap)", 0.50, 50000, 5, 60, 0),
            ("pol-high", "High-Throughput ($5.00 Cap)", 5.00, 500000, 8, 60, 0),
        ]
        for pid, pname, mcost, mtok, loop_n, loop_w, is_def in starter_policies:
            if not conn.execute("SELECT id FROM policies WHERE id = ?", (pid,)).fetchone():
                conn.execute(
                    """INSERT INTO policies (id, name, owner_id, max_cost_usd, max_tokens, max_tokens_per_minute, max_requests_per_minute, loop_detection_n, loop_detection_window_s, action, is_default, created_at, updated_at)
                       VALUES (?, ?, 'usr-student-01', ?, ?, 10000, 60, ?, ?, 'pause', ?, ?, ?)""",
                    (pid, pname, mcost, mtok, loop_n, loop_w, is_def, now, now),
                )

        # 6. Seed starter sandboxes if none exist yet
        sb_count = conn.execute("SELECT COUNT(*) FROM sandboxes").fetchone()[0]
        if sb_count == 0:
            conn.execute(
                """INSERT INTO sandboxes (id, owner_id, host_id, policy_id, name, state, is_demo, vcpu_count, mem_size_mb, vm_id, total_cost_usd, total_tokens, total_requests, trip_reason, trip_metric_value, trip_to_pause_latency_ms, created_at, started_at, frozen_at)
                   VALUES (?, 'usr-student-01', 'host-01', 'pol-cost-cap', 'demo-rogue-agent', 'FROZEN', 1, 2, 1024, 'fc-rogue01', 0.0102, 1284, 4, 'Cost cap exceeded ($0.0102 >= $0.0100)', 0.0102, 42.4, ?, ?, ?)""",
                ("sb-rogue-01", now, now, now),
            )
            conn.execute(
                """INSERT INTO sandboxes (id, owner_id, host_id, policy_id, name, state, is_demo, vcpu_count, mem_size_mb, vm_id, total_cost_usd, total_tokens, total_requests, created_at, started_at)
                   VALUES (?, 'usr-student-01', 'host-01', 'pol-standard', 'swe-bench-runner', 'RUNNING', 0, 4, 2048, 'fc-swe02', 0.0420, 3420, 6, ?, ?)""",
                ("sb-swe-02", now, now),
            )
            conn.execute(
                """INSERT INTO audit_events (id, sandbox_id, user_id, event_type, payload, ip_address, created_at)
                   VALUES (?, 'sb-rogue-01', 'usr-student-01', 'killswitch.tripped', ?, '127.0.0.1', ?)""",
                (
                    f"evt-{uuid.uuid4().hex[:8]}",
                    json.dumps({"reason": "max_cost_usd", "cost_usd": 0.0102, "latency_ms": 42.4}),
                    now,
                ),
            )

        conn.commit()


# ── User Queries ──────────────────────────────────────────────────────────────

def get_user_by_id(user_id: str) -> Optional[User]:
    ensure_initialized()
    with _lock:
        row = _get_conn().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _row_to_user(row) if row else None


def get_user_by_email(email: str) -> Optional[User]:
    ensure_initialized()
    with _lock:
        row = _get_conn().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return _row_to_user(row) if row else None


def get_user_by_github_id(github_id: str) -> Optional[User]:
    ensure_initialized()
    with _lock:
        row = _get_conn().execute("SELECT * FROM users WHERE github_id = ?", (github_id,)).fetchone()
        return _row_to_user(row) if row else None


def create_user(
    email: str,
    password_hash: Optional[str] = None,
    display_name: Optional[str] = None,
    username: Optional[str] = None,
    avatar_url: Optional[str] = None,
    github_id: Optional[str] = None,
    is_admin: bool = True,
) -> User:
    ensure_initialized()
    uid = str(uuid.uuid4())
    now = _now_iso()
    with _lock:
        conn = _get_conn()
        conn.execute(
            """INSERT INTO users (id, email, username, display_name, avatar_url, password_hash, github_id, is_active, is_admin, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)""",
            (uid, email, username, display_name, avatar_url, password_hash, github_id, int(is_admin), now, now),
        )
        conn.commit()
    provision_user_defaults(uid)
    return get_user_by_id(uid)  # type: ignore[return-value]


def list_users(page: int = 1, page_size: int = 25) -> list[User]:
    ensure_initialized()
    offset = (page - 1) * page_size
    with _lock:
        rows = _get_conn().execute(
            "SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?", (page_size, offset)
        ).fetchall()
        return [_row_to_user(r) for r in rows]


def update_user(
    user_id: str,
    is_admin: Optional[bool] = None,
    is_active: Optional[bool] = None,
    password_hash: Optional[str] = None,
    github_id: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> Optional[User]:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        updates: list[str] = ["updated_at = ?"]
        params: list[Any] = [_now_iso()]
        if is_admin is not None:
            updates.append("is_admin = ?")
            params.append(int(is_admin))
        if is_active is not None:
            updates.append("is_active = ?")
            params.append(int(is_active))
        if password_hash is not None:
            updates.append("password_hash = ?")
            params.append(password_hash)
        if github_id is not None:
            updates.append("github_id = ?")
            params.append(github_id)
        if avatar_url is not None:
            updates.append("avatar_url = ?")
            params.append(avatar_url)
        params.append(user_id)
        conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    return get_user_by_id(user_id)


def delete_user(user_id: str) -> None:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()


# ── Refresh & Password Reset Tokens ───────────────────────────────────────────

def save_refresh_token(user_id: str, token_hash: str, expires_at: datetime) -> None:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        conn.execute(
            "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) VALUES (?, ?, ?, ?, 0, ?)",
            (str(uuid.uuid4()), user_id, token_hash, expires_at.isoformat(), _now_iso()),
        )
        conn.commit()


def consume_refresh_token(token_hash: str) -> Optional[str]:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        row = conn.execute(
            "SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0", (token_hash,)
        ).fetchone()
        if not row:
            return None
        exp = _parse_dt(row["expires_at"])
        if not exp or exp <= datetime.now(UTC):
            return None
        conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?", (row["id"],))
        conn.commit()
        return row["user_id"]


def revoke_refresh_token_by_hash(token_hash: str) -> bool:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        cur = conn.execute(
            "UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ? AND revoked = 0", (token_hash,)
        )
        conn.commit()
        return cur.rowcount > 0


def save_reset_token(user_id: str, token_hash: str, expires_at: datetime) -> None:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        conn.execute(
            "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)",
            (str(uuid.uuid4()), user_id, token_hash, expires_at.isoformat(), _now_iso()),
        )
        conn.commit()


def consume_reset_token(token_hash: str) -> Optional[str]:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        row = conn.execute(
            "SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used = 0", (token_hash,)
        ).fetchone()
        if not row:
            return None
        exp = _parse_dt(row["expires_at"])
        if not exp or exp <= datetime.now(UTC):
            return None
        conn.execute("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", (row["id"],))
        conn.commit()
        return row["user_id"]


# ── API Keys & LLM Credentials ────────────────────────────────────────────────

def get_user_by_api_key_hash(key_hash: str) -> Optional[User]:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        row = conn.execute(
            "SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1", (key_hash,)
        ).fetchone()
        if not row:
            return None
        conn.execute("UPDATE api_keys SET last_used_at = ? WHERE id = ?", (_now_iso(), row["id"]))
        conn.commit()
        u_row = conn.execute("SELECT * FROM users WHERE id = ? AND is_active = 1", (row["user_id"],)).fetchone()
        return _row_to_user(u_row) if u_row else None


def list_api_keys(user_id: str) -> list[ApiKey]:
    ensure_initialized()
    with _lock:
        rows = _get_conn().execute(
            "SELECT * FROM api_keys WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        return [_row_to_api_key(r) for r in rows]


def create_api_key(user_id: str, name: str, key_hash: str, key_prefix: str) -> ApiKey:
    ensure_initialized()
    kid = str(uuid.uuid4())
    now = _now_iso()
    with _lock:
        conn = _get_conn()
        conn.execute(
            "INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
            (kid, user_id, name, key_hash, key_prefix, now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM api_keys WHERE id = ?", (kid,)).fetchone()
        return _row_to_api_key(row)


def revoke_api_key(user_id: str, key_id: str) -> bool:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        cur = conn.execute(
            "UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?", (key_id, user_id)
        )
        conn.commit()
        return cur.rowcount > 0


def list_llm_credentials(user_id: str) -> list[LLMCredential]:
    ensure_initialized()
    with _lock:
        rows = _get_conn().execute(
            "SELECT * FROM llm_credentials WHERE user_id = ?", (user_id,)
        ).fetchall()
        return [_row_to_llm_cred(r) for r in rows]


def upsert_llm_credential(user_id: str, provider: str, encrypted_key: str) -> LLMCredential:
    ensure_initialized()
    now = _now_iso()
    with _lock:
        conn = _get_conn()
        existing = conn.execute(
            "SELECT id FROM llm_credentials WHERE user_id = ? AND provider = ?", (user_id, provider)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE llm_credentials SET encrypted_key = ?, updated_at = ? WHERE id = ?",
                (encrypted_key, now, existing["id"]),
            )
            cid = existing["id"]
        else:
            cid = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO llm_credentials (id, user_id, provider, encrypted_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (cid, user_id, provider, encrypted_key, now, now),
            )
        conn.commit()
        row = conn.execute("SELECT * FROM llm_credentials WHERE id = ?", (cid,)).fetchone()
        return _row_to_llm_cred(row)


def delete_llm_credential(user_id: str, provider: str) -> bool:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        cur = conn.execute(
            "DELETE FROM llm_credentials WHERE user_id = ? AND provider = ?", (user_id, provider)
        )
        conn.commit()
        return cur.rowcount > 0


# ── Hosts ─────────────────────────────────────────────────────────────────────

def list_hosts(owner_id: str) -> list[Host]:
    ensure_initialized()
    with _lock:
        rows = _get_conn().execute(
            "SELECT * FROM hosts WHERE owner_id = ? AND is_active = 1 ORDER BY created_at DESC",
            (owner_id,),
        ).fetchall()
        return [_row_to_host(r) for r in rows]


def get_host(host_id: str) -> Optional[Host]:
    ensure_initialized()
    with _lock:
        row = _get_conn().execute("SELECT * FROM hosts WHERE id = ?", (host_id,)).fetchone()
        return _row_to_host(row) if row else None


def create_host(
    owner_id: str,
    name: str,
    agent_url: str,
    token_hash: str,
    total_vcpu: int = 8,
    total_ram_mb: int = 16384,
    total_disk_gb: int = 100,
    firecracker_version: Optional[str] = "v1.7.0 (Linux 5.10.198)",
) -> Host:
    ensure_initialized()
    hid = f"host-{uuid.uuid4().hex[:8]}"
    now = _now_iso()
    with _lock:
        conn = _get_conn()
        conn.execute(
            """INSERT INTO hosts (id, owner_id, name, agent_url, token_hash, is_active, last_heartbeat_at, total_vcpu, total_ram_mb, total_disk_gb, firecracker_version, created_at)
               VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)""",
            (hid, owner_id, name, agent_url, token_hash, now, total_vcpu, total_ram_mb, total_disk_gb, firecracker_version, now),
        )
        conn.commit()
    return get_host(hid)  # type: ignore[return-value]


def deactivate_host(owner_id: str, host_id: str) -> bool:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        cur = conn.execute(
            "UPDATE hosts SET is_active = 0 WHERE id = ? AND owner_id = ?", (host_id, owner_id)
        )
        conn.commit()
        return cur.rowcount > 0


def update_host_heartbeat(host_id: str) -> bool:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        cur = conn.execute("UPDATE hosts SET last_heartbeat_at = ? WHERE id = ?", (_now_iso(), host_id))
        conn.commit()
        return cur.rowcount > 0


# ── Policies ──────────────────────────────────────────────────────────────────

def list_policies(owner_id: str) -> list[Policy]:
    ensure_initialized()
    with _lock:
        rows = _get_conn().execute(
            "SELECT * FROM policies WHERE owner_id = ? ORDER BY is_default DESC, created_at DESC",
            (owner_id,),
        ).fetchall()
        return [_row_to_policy(r) for r in rows]


def get_policy(policy_id: str) -> Optional[Policy]:
    ensure_initialized()
    with _lock:
        row = _get_conn().execute("SELECT * FROM policies WHERE id = ?", (policy_id,)).fetchone()
        return _row_to_policy(row) if row else None


def create_policy(
    owner_id: str,
    name: str,
    max_cost_usd: Optional[float] = None,
    max_tokens: Optional[int] = None,
    max_tokens_per_minute: Optional[int] = None,
    max_requests_per_minute: Optional[int] = None,
    max_cpu_seconds: Optional[float] = None,
    max_wallclock_seconds: Optional[int] = None,
    loop_detection_n: int = 5,
    loop_detection_window_s: int = 60,
    loop_similarity_threshold: float = 0.95,
    action: KillswitchAction = KillswitchAction.PAUSE,
    is_default: bool = False,
) -> Policy:
    ensure_initialized()
    pid = f"pol-{uuid.uuid4().hex[:8]}"
    now = _now_iso()
    with _lock:
        conn = _get_conn()
        conn.execute(
            """INSERT INTO policies (id, name, owner_id, max_cost_usd, max_tokens, max_tokens_per_minute, max_requests_per_minute, max_cpu_seconds, max_wallclock_seconds, loop_detection_n, loop_detection_window_s, loop_similarity_threshold, action, is_default, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                pid,
                name,
                owner_id,
                max_cost_usd,
                max_tokens,
                max_tokens_per_minute,
                max_requests_per_minute,
                max_cpu_seconds,
                max_wallclock_seconds,
                loop_detection_n,
                loop_detection_window_s,
                loop_similarity_threshold,
                action.value if isinstance(action, KillswitchAction) else str(action),
                int(is_default),
                now,
                now,
            ),
        )
        conn.commit()
    return get_policy(pid)  # type: ignore[return-value]


def update_policy_fields(policy_id: str, owner_id: str, **fields: Any) -> Optional[Policy]:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        existing = conn.execute(
            "SELECT * FROM policies WHERE id = ? AND owner_id = ?", (policy_id, owner_id)
        ).fetchone()
        if not existing:
            return None
        updates = ["updated_at = ?"]
        params: list[Any] = [_now_iso()]
        for k, v in fields.items():
            if v is not None:
                if k == "action" and isinstance(v, KillswitchAction):
                    v = v.value
                updates.append(f"{k} = ?")
                params.append(v)
        params.append(policy_id)
        conn.execute(f"UPDATE policies SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    return get_policy(policy_id)


def delete_policy(policy_id: str, owner_id: str) -> bool:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        cur = conn.execute(
            "DELETE FROM policies WHERE id = ? AND owner_id = ?", (policy_id, owner_id)
        )
        conn.commit()
        return cur.rowcount > 0


# ── Sandboxes & Quotas ────────────────────────────────────────────────────────

def get_user_quota(user_id: str) -> Optional[UserQuota]:
    ensure_initialized()
    with _lock:
        row = _get_conn().execute("SELECT * FROM user_quotas WHERE user_id = ?", (user_id,)).fetchone()
        if not row:
            return None
        return UserQuota(
            user_id=row["user_id"],
            max_concurrent_vms=row["max_concurrent_vms"],
            max_vcpu=row["max_vcpu"],
            max_ram_mb=row["max_ram_mb"],
            max_disk_gb=row["max_disk_gb"],
        )


def count_active_sandboxes(user_id: str) -> int:
    ensure_initialized()
    with _lock:
        row = _get_conn().execute(
            "SELECT COUNT(*) FROM sandboxes WHERE owner_id = ? AND state IN ('CREATING', 'RUNNING', 'FROZEN')",
            (user_id,),
        ).fetchone()
        return int(row[0])


def list_sandboxes(owner_id: str, page: int = 1, page_size: int = 50) -> list[Sandbox]:
    ensure_initialized()
    offset = (page - 1) * page_size
    with _lock:
        rows = _get_conn().execute(
            "SELECT * FROM sandboxes WHERE owner_id = ? AND state != 'DESTROYED' ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (owner_id, page_size, offset),
        ).fetchall()
        return [_row_to_sandbox(r) for r in rows]


def get_sandbox(sandbox_id: str) -> Optional[Sandbox]:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        row = conn.execute("SELECT * FROM sandboxes WHERE id = ?", (sandbox_id,)).fetchone()
        if not row:
            # Support prefix lookup (e.g. CLI first 8 chars)
            row = conn.execute(
                "SELECT * FROM sandboxes WHERE id LIKE ? AND state != 'DESTROYED' ORDER BY created_at DESC LIMIT 1",
                (f"{sandbox_id}%",),
            ).fetchone()
        return _row_to_sandbox(row) if row else None


def get_sandbox_for_user(sandbox_id: str, owner_id: str) -> Optional[Sandbox]:
    sb = get_sandbox(sandbox_id)
    if sb and sb.owner_id == owner_id:
        return sb
    return None


def create_sandbox_record(
    owner_id: str,
    host_id: str,
    policy_id: Optional[str],
    name: str,
    vcpu_count: int = 2,
    mem_size_mb: int = 1024,
    is_demo: bool = False,
) -> Sandbox:
    ensure_initialized()
    sid = f"sb-{uuid.uuid4().hex[:8]}"
    vm_id = f"fc-{sid[3:]}"
    now = _now_iso()
    with _lock:
        conn = _get_conn()
        conn.execute(
            """INSERT INTO sandboxes (id, owner_id, host_id, policy_id, name, state, is_demo, vcpu_count, mem_size_mb, vm_id, total_cost_usd, total_tokens, total_requests, created_at, started_at)
               VALUES (?, ?, ?, ?, ?, 'RUNNING', ?, ?, ?, ?, 0.0, 0, 0, ?, ?)""",
            (sid, owner_id, host_id, policy_id, name, int(is_demo), vcpu_count, mem_size_mb, vm_id, now, now),
        )
        conn.commit()
    return get_sandbox(sid)  # type: ignore[return-value]


def update_sandbox(sandbox_id: str, **fields: Any) -> Optional[Sandbox]:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        updates = []
        params: list[Any] = []
        for k, v in fields.items():
            if isinstance(v, SandboxState):
                v = v.value
            elif isinstance(v, datetime):
                v = v.isoformat()
            updates.append(f"{k} = ?")
            params.append(v)
        if not updates:
            return get_sandbox(sandbox_id)
        params.append(sandbox_id)
        conn.execute(f"UPDATE sandboxes SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    return get_sandbox(sandbox_id)


# ── Audit Events & Admin Summaries ────────────────────────────────────────────

def add_audit_event(
    event_type: AuditEventType | str,
    sandbox_id: Optional[str] = None,
    user_id: Optional[str] = None,
    payload: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditEvent:
    ensure_initialized()
    eid = f"evt-{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    et_str = event_type.value if isinstance(event_type, AuditEventType) else str(event_type)
    payload_str = json.dumps(payload) if payload is not None else None
    with _lock:
        conn = _get_conn()
        conn.execute(
            "INSERT INTO audit_events (id, sandbox_id, user_id, event_type, payload, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (eid, sandbox_id, user_id, et_str, payload_str, ip_address, now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM audit_events WHERE id = ?", (eid,)).fetchone()
        return _row_to_audit(row)


def list_audit_events(page: int = 1, page_size: int = 50) -> list[AuditEvent]:
    ensure_initialized()
    offset = (page - 1) * page_size
    with _lock:
        rows = _get_conn().execute(
            "SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (page_size, offset),
        ).fetchall()
        return [_row_to_audit(r) for r in rows]


def get_admin_overview_stats() -> dict[str, Any]:
    ensure_initialized()
    with _lock:
        conn = _get_conn()
        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        host_count = conn.execute("SELECT COUNT(*) FROM hosts WHERE is_active = 1").fetchone()[0]
        sb_count = conn.execute("SELECT COUNT(*) FROM sandboxes WHERE state != 'DESTROYED'").fetchone()[0]
        breached_count = conn.execute(
            "SELECT COUNT(*) FROM sandboxes WHERE state = 'FROZEN'"
        ).fetchone()[0]
        total_spend = conn.execute(
            "SELECT COALESCE(SUM(total_cost_usd), 0.0) FROM sandboxes"
        ).fetchone()[0]
        return {
            "total_users": int(user_count),
            "active_hosts": int(host_count),
            "total_sandboxes": int(sb_count),
            "breached_sandboxes": int(breached_count),
            "total_spend_usd": round(float(total_spend), 4),
        }


def get_admin_breach_alerts() -> list[dict[str, Any]]:
    ensure_initialized()
    with _lock:
        rows = _get_conn().execute(
            """SELECT s.id, s.name, s.trip_reason, s.total_cost_usd, s.frozen_at, s.created_at, u.email
               FROM sandboxes s
               JOIN users u ON s.owner_id = u.id
               WHERE s.state IN ('FROZEN', 'ERROR')
               ORDER BY COALESCE(s.frozen_at, s.created_at) DESC
               LIMIT 50"""
        ).fetchall()
        return [
            {
                "id": f"alert-{r['id'][:8]}",
                "sandbox_id": r["id"],
                "sandbox_name": r["name"],
                "owner_email": r["email"],
                "reason": r["trip_reason"] or "Cost cap threshold tripped",
                "cost_usd": float(r["total_cost_usd"]),
                "status": "new",
                "created_at": _parse_dt(r["frozen_at"] or r["created_at"]) or datetime.now(UTC),
            }
            for r in rows
        ]
