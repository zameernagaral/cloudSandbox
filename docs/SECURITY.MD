# Security Plan & Threat Model: Cloud Sandbox

**Document Status:** Approved Specification  
**Project:** Cloud Sandbox — Second-Year CSE Capstone Project  
**Authoritative References:** [`docs/SIGNOFF.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/SIGNOFF.md), [`docs/IDEA.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/IDEA.md), [`README.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/README.md).

---

## 1. Architecture & Hosting Topology

Cloud Sandbox isolates autonomous AI coding agents inside ephemeral Firecracker microVMs executing on bare-metal Linux hardware. The platform enforces strict architectural boundaries across five primary tiers:

```
[ Developer Browser / CLI (sandboxctl) ]
                 │
                 ▼  (HTTPS / WSS via Caddy or Nginx reverse proxy)
[ Control Plane: FastAPI (Port 8000) ]
        ├── PostgreSQL 15 (Port 5432 - Internal VPC / Docker network only)
        └── Redis 7 (Port 6379 - Internal VPC / Docker network only)
                 │
                 ▼  (mTLS or Encrypted Token Bridge over Private Network)
[ Host Agent Daemon: Python / asyncio ]
        ├── Firecracker v1.7.0 MicroVM Jailers (/srv/jailer/firecracker/<id>/root)
        ├── Hardware Linux KVM (/dev/kvm, cgroups v2, chroot, seccomp filters)
        ├── Hardware VSock Multiplexer (Port 1024 for bidirectional streaming)
        └── Token-Metering LLM Proxy (Port 8888 -> api.openai.com / api.anthropic.com)
```

### Hosting & Deployment Infrastructure
* **Web Frontend:** Single Page Application built with React 18 and Vite, compiled to static assets and served by Nginx or Caddy with strict HTTP security headers and Content Security Policy.
* **Control Plane API:** FastAPI application running under Python 3.11 with asynchronous database access via SQLAlchemy and Alembic migrations.
* **Database & Cache:** Dedicated PostgreSQL 15 database instance and Redis 7 cache running within a private Docker bridge network without public internet port exposure.
* **Host Hypervisor Nodes:** Bare-metal Linux servers running Ubuntu 22.04 LTS (kernel 5.10 or higher) with hardware virtualization support (`/dev/kvm`) enabled. MicroVM processes run unprivileged inside Firecracker jailers.
* **Perimeter Gateway:** Caddy reverse proxy providing automated TLS certificates via Let's Encrypt in production, terminating HTTPS and WSS connections before forwarding requests to the control plane.

---

## 2. Threat Analysis & Defence Matrix

The threat matrix covers all 27 core security requirements. Every row details the applicability to Cloud Sandbox, the server-side architectural defence, the concrete testing and verification procedure, and the current implementation status (`Planned`, `Done`, `Open`, or `N-A`).

| Threat # | Threat Description | Applies Here | Server-Side Defence | How I Test It | Status |
|:---|:---|:---:|:---|:---|:---:|
| **1** | **Auth and Sessions** | Yes | Implemented using standard libraries (`python-jose`, `passlib` with bcrypt). Password hashes use bcrypt with 12 salt rounds. Access tokens are short-lived JWTs (15-minute expiration) transmitted in `Authorization: Bearer` headers; refresh tokens are stored in the database with secure SHA-256 hashes and 30-day expiration. Session cookies are configured with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes. Login endpoints return identical error messages ("Invalid credentials") for wrong emails and wrong passwords. Registration returns generic responses to prevent user enumeration. Password reset tokens expire in 15 minutes, are single-use, and invalidate upon redemption. Web dashboard and API reside on the same registrable domain. | Issue a POST request to `/api/v1/auth/login` with an unregistered email and then with a valid email but incorrect password; verify both return identical HTTP 401 status and JSON payload. Verify expired and replayed refresh tokens return HTTP 401. | Done |
| **2** | **Permissions** | Yes | Deny-by-default role-based access control. All protected endpoints depend on the `get_current_user` FastAPI dependency. Sandboxes, policies, and credentials verify ownership against `owner_id == current_user.id`. Administrative endpoints (`/api/v1/hosts`, system policy defaults) strictly enforce the `require_admin` dependency which verifies the `is_admin` database flag. | Send an unauthorized request without an `Authorization` header to `/api/v1/sandboxes` and verify HTTP 401. Send a request using a non-admin bearer token to an admin endpoint like `/api/v1/hosts` and verify HTTP 403 Forbidden. | Done |
| **3** | **Input Validation** | Yes | Strict schema validation on the server using Pydantic v2 schemas. Unknown and extra fields are forbidden by setting `extra = "forbid"` on all request schemas. Request body size is capped at 1 MB via ASGI middleware. All database access uses SQLAlchemy 2.0 ORM with parameterized SQL queries, eliminating raw string concatenation. | Submit a POST request to `/api/v1/sandboxes` containing an unrecognised field such as `malicious_field: true`; verify the server rejects the request with HTTP 422 Unprocessable Entity. Send an oversized payload (>1 MB) and verify HTTP 413. | Done |
| **4** | **Cross-Site Scripting (XSS)** | Yes | React 18 JSX provides automatic string escaping by default. Direct DOM manipulation and `dangerouslySetInnerHTML` are prohibited across the dashboard codebase. Terminal streaming output from Xterm.js is sanitized using the official `@xterm/addon-serialize` and sanitization routines. Content Security Policy is delivered with strict source directives, disallowing `unsafe-inline` scripts. | Attempt to set a sandbox name or prompt containing an HTML script tag; verify the value renders as literal text entities in the dashboard DOM and that the browser console logs no script execution. | Done |
| **5** | **Cross-Site Request Forgery (CSRF)** | Yes | The API relies on stateless Bearer token authorization headers rather than ambient browser credentials for REST and WebSocket connections. Cookies utilize `SameSite=Lax` (or `SameSite=Strict` in production). Control plane middleware inspects the `Origin` and `Referer` HTTP headers on state-changing methods (POST, PUT, DELETE, PATCH) against an explicit whitelist of allowed origins. | Submit a state-changing POST request from an external origin using an unauthorized browser form; verify the request is blocked by origin verification middleware with HTTP 403. | Done |
| **6** | **Rate Limiting & Cost Abuse** | Yes | Token-bucket sliding-window rate limiting backed by Redis sorted sets (`ZREMRANGEBYSCORE`, `ZADD`, `ZCARD`). Authentication endpoints (`/auth/login`, `/auth/register`) are limited to 10 requests per minute per IP address. LLM proxy requests are monitored in real time, and sandboxes exceeding their policy budget trigger immediate microVM pauses. Breaches return HTTP 429 Too Many Requests with a `Retry-After` header. | Use a script or curl loop to fire 15 rapid POST requests to `/api/v1/auth/login`; verify requests 1 through 10 process normally and requests 11 through 15 return HTTP 429 with appropriate `Retry-After` response headers. | Done |
| **7** | **Bot Protection** | Yes | Public registration and the public demo sandbox trigger incorporate server-verified challenge tokens (Cloudflare Turnstile) and an invisible honeypot form field (`website_url_hp`). If the honeypot field contains any value or the challenge token fails server validation, the request is rejected immediately without incurring backend VM allocation. | Submit a registration payload with the honeypot field populated; verify the server silently drops or rejects the request with HTTP 400. Attempt submission with a forged challenge token; verify rejection. | Planned |
| **8** | **Secrets Management** | Yes | Strict separation of public and private secrets. All private secrets (`SECRET_KEY`, `ENCRYPTION_KEY`, `GITHUB_CLIENT_SECRET`, `HOST_AGENT_TOKEN`, PostgreSQL credentials) reside exclusively in server environment variables and are never committed to version control. The web application only consumes variables prefixed with `VITE_` (`VITE_API_URL`). User-supplied LLM API keys are encrypted at rest using AES-256-GCM. Secret rotation runbook is documented. | Inspect the compiled web bundle in `dashboard/dist/` using grep to confirm zero occurrences of `ENCRYPTION_KEY`, `SECRET_KEY`, or `GITHUB_CLIENT_SECRET`. Verify secret scanning alerts via automated git pre-commit hooks. | Done |
| **9** | **Dependencies** | Yes | Deterministic lockfiles committed for all ecosystems (`package-lock.json` in dashboard, pinned `requirements.txt` / lockfiles in control plane and host agent). CI pipelines run automated vulnerability scans (`npm audit` and `pip-audit`). Unused and orphaned dependencies are actively removed. | Run `npm audit --audit-level=high` inside `dashboard/` and run `pip-audit` inside `control-plane/` during CI; verify zero high or critical severity vulnerabilities before release builds proceed. | Done |
| **10** | **Security Headers** | Yes | Comprehensive security headers configured on both web frontend (Nginx/Caddy) and API gateway: `Content-Security-Policy` with restrictive directives, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. | Inspect response headers of both the landing page (`http://localhost:5173` or production URL) and API root (`/api/v1/`) using `curl -I`; verify all six security headers are present with exact expected values. | Done |
| **11** | **Cross-Origin Resource Sharing (CORS)** | Yes | FastAPI `CORSMiddleware` restricts cross-origin access strictly to configured domain origins (`ALLOWED_ORIGINS`). Wildcard origin (`*`) is forbidden when `allow_credentials=True` is enabled. Preflight OPTIONS requests from unauthorized origins receive no CORS access control headers. | Execute a preflight OPTIONS request with an unauthorized origin header such as `Origin: https://malicious-site.example`; verify the response omits `Access-Control-Allow-Origin` and blocks browser cross-origin requests. | Done |
| **12** | **File Uploads** | Yes | File transfers are restricted to injecting initial workspace files into sandboxes. File types are restricted via an allow-list of plaintext source extensions (`.py`, `.js`, `.ts`, `.json`, `.md`, `.txt`). File size is capped at 5 MB per payload. Uploaded files are written directly into the ephemeral guest rootfs volume inside the chroot jailer and are never executable by or served directly from the host web server. | Attempt to upload a 20 MB binary or an unauthorized file extension (`.exe`, `.iso`); verify the control plane rejects the upload with HTTP 400 Bad Request or HTTP 413 Payload Too Large. | Planned |
| **13** | **Logging and Error Handling** | Yes | Structured logging with `structlog`. Internal stack traces, raw SQL queries, and system file paths are suppressed from public HTTP responses; generic error descriptions are returned with unique request correlation IDs (`request_id`). Log filters automatically scrub sensitive parameters, including Authorization headers, passwords, and decrypted API keys. | Trigger an unhandled server error by requesting an invalid sandbox ID format; verify the client receives a clean JSON error response containing a correlation ID while the full stack trace is retained solely in server logs. | Done |
| **14** | **Personal Data & Privacy** | Yes | Principle of data minimization: the system stores only email address, display name, password hash, and microVM lifecycle audit records. A dedicated account deletion endpoint (`DELETE /api/v1/auth/me`) cascades deletion to all user sandboxes, credentials, and API keys. Database backups are encrypted with AES-256 and accessible only to authorized infrastructure leads. | Call `DELETE /api/v1/auth/me` with a test account; verify that all associated records in `sandboxes`, `policies`, `llm_credentials`, and `users` are completely deleted from PostgreSQL. | Planned |
| **15** | **Admin Panel & Privileged Actions** | Yes | Administrative routes require authenticated sessions with `is_admin: true` in the database. All administrative modifications (registering hosts, toggling global policies) emit persistent records into the `audit_events` table. Rate limiting on administrative authentication applies growing-delay throttling (exponential backoff) rather than permanent lockouts to prevent denial-of-service. Default admin credentials are prohibited. | Attempt to invoke `/api/v1/hosts` using standard user credentials; verify HTTP 403. Attempt repeated failed logins against an admin account; verify successive attempts enforce increasing delay throttles. | Done |
| **16** | **Database Security** | Yes | PostgreSQL runs as an unprivileged service user (`sandbox`), not as the PostgreSQL superuser. Access is restricted to the internal Docker bridge network with no public internet port exposure. Development and production databases run on completely isolated database instances. Automated daily encrypted database dumps (`pg_dump` piped through GPG) are scheduled via GitHub Actions cron to S3 cold storage with documented restoration rehearsals. [VERIFY: verify backup policy and retention on official hosting page]. | Verify that port 5432 is unreachable from outside the host server firewall. Verify successful execution of a test database dump and subsequent restore rehearsal on an isolated staging database. | Done |
| **17** | **Object-Level Access & Mass Assignment** | Yes | Every database query on user-scoped resources enforces `WHERE owner_id = :user_id`. Pydantic update schemas explicitly exclude privileged attributes such as `is_admin`, `is_active`, or quota limits, preventing mass-assignment vulnerabilities. | Authenticate as User A and attempt to update or delete a sandbox owned by User B (`PATCH /api/v1/sandboxes/<user-b-id>`); verify the server returns HTTP 404 Not Found or HTTP 403 Forbidden. | Done |
| **18** | **Injection Beyond SQL** | Yes | No `shell=True` commands are permitted in Python subprocesses. Firecracker hypervisor communication uses direct HTTP over local Unix domain sockets (`/tmp/firecracker.sock`). Path traversal is blocked by validating all sandbox IDs against strict UUIDv4 regex patterns before constructing jailer paths. Server-Side Request Forgery (SSRF) in the LLM proxy is blocked by restricting outbound HTTP calls strictly to official upstream LLM provider hosts (`api.openai.com`, `api.anthropic.com`) and dropping all private IP ranges (127.0.0.1, 10.0.0.0/8, 169.254.169.254). | Attempt to create a sandbox with an ID containing path traversal characters (`../../etc/passwd`); verify schema rejection. Attempt to direct the LLM proxy to an internal metadata IP address; verify immediate connection drop. | Done |
| **19** | **Email and Domain Security** | Yes | The production domain enforces DNS SPF records (`v=spf1 -all` or authorized transactional mail provider), 2048-bit DKIM cryptographic signing, and a DMARC policy of `p=reject`. System notification templates prevent user control over email headers (`From`, `To`, `Subject`). Two-factor authentication is mandatory on domain registrar and DNS management consoles. Strict Transport Security (HSTS) is enabled. Security contact details are published at `/.well-known/security.txt`. | Query domain DNS records using `dig` for SPF, DKIM, and DMARC TXT records; verify strict policy syntax. Access `/.well-known/security.txt` via HTTPS; verify valid email contact and cryptographic key pointers. | Planned |
| **20** | **Software Supply Chain** | Yes | All builds utilize locked package manifests (`package-lock.json`, `npm ci`, pinned Python requirements). Automated secret scanning with push protection is enforced across GitHub repositories. Branch protection on `main` requires passing automated CI checks and peer review. Two-factor authentication is mandatory on all GitHub and hosting accounts. The dashboard `.npmrc` sets `ignore-scripts=true`. All GitHub Actions workflows are pinned to full 40-character commit SHAs. A pre-commit `gitleaks` hook blocks local commits containing secrets. | Attempt to commit a mock API key; verify the local pre-commit hook rejects the commit. Verify `.npmrc` includes `ignore-scripts=true`. Review GitHub Actions files to confirm all actions use full commit hashes. | Done |
| **21** | **Third-Party Scripts & Embeds** | Yes | Zero external tracking scripts, CDNs, or marketing analytics are permitted in the application bundle. All frontend fonts, icons, and libraries are bundled locally at build time. The sole permissible third-party script is the Cloudflare Turnstile bot verification widget, loaded only on authentication forms with pinned script integrity and explicit CSP script-src allowlisting. | Inspect network requests during landing page and dashboard load in developer tools; verify 100% of network assets originate from the application host domain. | Done |
| **22** | **Webhooks and Payments** | N-A | No payment gateways (Stripe, PayPal) or credit card processing are included in Cloud Sandbox; budget limits are enforced strictly as operational software caps. For internal host-agent status callbacks (`/api/v1/internal/`), payloads require HMAC-SHA256 signatures using `HOST_AGENT_TOKEN`, verified against request timestamps to prevent replay attacks, with unique event UUIDs for idempotency. | Send an internal callback request with an altered HMAC signature or expired timestamp; verify the control plane returns HTTP 401 Unauthorized. | Done |
| **23** | **AI Features & Execution Isolation** | Yes | AI agent execution occurs entirely within isolated Firecracker microVMs backed by hardware KVM, cgroups, and chroot jailers. The agent possesses no access to the host filesystem, network metadata endpoints, or host credentials. User LLM API keys are stored encrypted on the host, decrypted only in host proxy memory, and injected into upstream calls; keys never enter the guest VM. Continuous token metering halts rogue agents in under 1,000 ms upon budget breach. | Run the built-in rogue agent simulation (`/demo`); verify the agent trips the $0.01 threshold, halts execution in <1,000 ms via hardware vsock signal, and confirms that `/proc` and environment inside the VM hold zero host secrets. | Done |
| **24** | **Monitoring and Incidents** | Yes | Real-time Prometheus metrics endpoint (`/metrics`) tracks error rates, authentication failures, and killswitch trip latency. Alerts trigger on sustained 5xx response rates > 1% or login failure spikes > 5/min. A formalized one-page incident response plan governs host isolation, credential rotation, backup restoration, and stakeholder notification. | Simulate 10 consecutive failed logins; verify metric counter increment in Prometheus. Trigger an artificial killswitch trip; verify metric `killswitch_trip_latency_ms` is recorded. | Done |
| **25** | **Standards Map (OWASP ASVS & Top 10)** | Yes | The security controls map comprehensively to OWASP Application Security Verification Standard (ASVS) 4.0 Level 2 chapters and the OWASP Top 10 (2021). Detailed standards cross-reference matrix is maintained in Section 6 of this document. [VERIFY current editions on official OWASP website]. | Periodic audit against OWASP ASVS checklist items; verify all applicable controls are verified and documented. | Done |
| **26** | **Documentation & Repository Privacy** | Yes | The project source repository is set to private. The `docs/` directory and internal architecture specifications are excluded from public distribution bundles. Evidence logs, terminal scrollbacks, and demonstration recordings are scrubbed of all tokens, passwords, and personally identifiable information. | Clone repository without credentials to verify private visibility. Search repository commit history using automated secret scanning tools to verify zero credentials exist in documentation. | Done |
| **27** | **Agent & Tooling Security** | Yes | Terminal command execution within development tools requires explicit sandbox boundaries and manual approval for unsandboxed commands. Unused MCP tools and plugins are disabled. All installed developer plugins undergo code review. Zero production credentials or private keys are exposed to the AI development assistant or shell environment. | Verify that terminal tools run in sandbox mode by default. Inspect environment variables available to the AI agent to verify absence of production private keys. | Done |

---

## 3. Secrets Inventory & Exposure Matrix

The platform classifies and isolates all secrets according to the principle of least privilege:

| Secret Identifier | Classification | Storage Location | Framework Prefix / Access Scope | Rotation Protocol |
|:---|:---|:---|:---|:---|
| `SECRET_KEY` / `JWT_SECRET_KEY` | Private | Control Plane Environment (`.env`) | Server only (never exposed to browser) | Regenerate 32-byte secret; invalidates all active JWT access tokens. |
| `ENCRYPTION_KEY` | Private | Control Plane Environment (`.env`) | Server only (never exposed to browser) | Execute database migration re-encrypting `llm_credentials` with new 32-byte key. |
| `GITHUB_CLIENT_SECRET` | Private | Control Plane Environment (`.env`) | Server only (never exposed to browser) | Rotate secret in GitHub Developer Settings; update `.env` and restart service. |
| `POSTGRES_PASSWORD` | Private | PostgreSQL & Control Plane (`.env`) | Internal Docker network only | `ALTER USER sandbox WITH PASSWORD '...';` update `.env` and redeploy. |
| `HOST_AGENT_TOKEN` | Private | Control Plane & Host Agent (`.env`) | Host-to-control plane bridge only | Update shared token across host nodes and control plane simultaneously. |
| `User LLM Keys` (OpenAI / Anthropic) | Confidential | PostgreSQL `llm_credentials` table | AES-256-GCM ciphertext at rest; host proxy memory only | Users update or delete credentials via `/settings` dashboard page. |
| `VITE_API_URL` | Public | Web Dashboard Environment (`.env`) | Browser bundle (`VITE_` prefix permitted) | Update build configuration and redeploy frontend static assets. |

---

## 4. Security Headers Configuration

### Web Application Headers (Nginx / Caddy Frontend)
The frontend reverse proxy delivers static assets with the following mandatory HTTP response headers:

* `Content-Security-Policy`: `default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ws: wss: http://localhost:8000 https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none';`
* `X-Content-Type-Options`: `nosniff`
* `X-Frame-Options`: `DENY`
* `Referrer-Policy`: `strict-origin-when-cross-origin`
* `Permissions-Policy`: `accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`
* `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`

### API Gateway Headers (FastAPI Control Plane)
All API responses include defensive headers injected via middleware:

* `X-Content-Type-Options`: `nosniff`
* `X-Frame-Options`: `DENY`
* `Cache-Control`: `no-store, no-cache, must-revalidate, max-age=0` (applied to sensitive endpoints)
* `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`

---

## 5. One-Page Incident Response Plan

In the event of an active intrusion attempt, anomalous microVM resource escape, or credential compromise, the team executes the following four-phase incident plan:

```
[ PHASE 1: CONTAINMENT ]
  1. Trigger master killswitch across active microVMs via host daemon.
  2. Isolate compromised host node by terminating host agent process:
     docker-compose stop host-agent
  3. If control plane is compromised, place Caddy into maintenance mode
     returning HTTP 503 to all incoming public traffic.

[ PHASE 2: CREDENTIAL ROTATION ]
  1. Rotate database master password in PostgreSQL and update .env.
  2. Rotate ENCRYPTION_KEY and re-encrypt user LLM credentials table.
  3. Rotate JWT_SECRET_KEY, forcing immediate termination of all active sessions.
  4. Revoke and regenerate GITHUB_CLIENT_SECRET in GitHub OAuth console.
  5. Rotate HOST_AGENT_TOKEN across all registered host agents.

[ PHASE 3: EVIDENCE COLLECTION & RESTORATION ]
  1. Capture memory dump and disk image of suspect microVM jailer directory:
     /srv/jailer/firecracker/<suspect-id>/
  2. Export audit log records from PostgreSQL audit_events table.
  3. Restore database from the most recent verified encrypted cold backup.
  4. Restart services within an isolated staging environment and verify integrity.

[ PHASE 4: COMMUNICATION & POST-MORTEM ]
  1. Primary Escalation Contact: Capstone Team Security Lead.
  2. Secondary Escalation Contact: Faculty Capstone Project Mentor.
  3. Compile incident timeline, root cause analysis, and remediation diff within 48 hours.
```

---

## 6. Standards Mapping: OWASP ASVS & OWASP Top 10

This matrix maps Cloud Sandbox threat mitigations to the OWASP Application Security Verification Standard (ASVS) 4.0 Level 2 chapters and the current OWASP Top 10 (2021). [VERIFY current editions on official OWASP website].

| OWASP Top 10 (2021) | OWASP ASVS 4.0 Chapter | Cloud Sandbox Threat Row Mappings | Applied Mitigations |
|:---|:---|:---|:---|
| **A01: Broken Access Control** | V4: Access Control Verification | Rows 2, 15, 17 | Deny-by-default endpoints, `owner_id` tenancy checks on every query, `is_admin` dependency enforcement. |
| **A02: Cryptographic Failures** | V2: Authentication / V8: Data Protection | Rows 1, 8, 16, 23 | Bcrypt (12 rounds) for passwords, AES-256-GCM for LLM credentials, TLS 1.3 in transit, encrypted database dumps. |
| **A03: Injection** | V5: Validation, Sanitization and Encoding | Rows 3, 4, 18 | SQLAlchemy parameterized queries, Pydantic v2 schema validation with `extra = "forbid"`, no `shell=True` subprocesses. |
| **A04: Insecure Design** | V1: Architecture, Design and Threat Modeling | Rows 6, 23, 24 | Sub-second cost-cap killswitch, hardware Firecracker jailer isolation, continuous token burn velocity monitoring. |
| **A05: Security Misconfiguration** | V14: Configuration Verification | Rows 10, 11, 20 | Strict CSP, HSTS preload, no wildcard CORS with credentials, `ignore-scripts=true` in npm configuration. |
| **A06: Vulnerable & Outdated Components** | V10: Malicious Code / V14: Configuration | Rows 9, 20 | Locked package manifests (`package-lock.json`), automated `npm audit` and `pip-audit` in CI pipelines. |
| **A07: Identification & Auth Failures** | V2: Authentication / V3: Session Management | Rows 1, 6, 15 | Short-lived JWTs, secure HTTP-only cookies, Redis token-bucket rate limiting, exponential backoff on auth failures. |
| **A08: Software & Data Integrity Failures** | V10: Malicious Code / V14: Configuration | Rows 20, 21 | Commit SHA pinning in GitHub Actions, subresource integrity (SRI), pre-commit `gitleaks` secret scanning. |
| **A09: Security Logging & Monitoring Failures** | V7: Error Handling and Logging | Rows 13, 24 | Structured `structlog` logging, immutable `audit_events` table, Prometheus metrics for error and failure spikes. |
| **A10: Server-Side Request Forgery (SSRF)** | V13: API and Web Service Verification | Rows 18, 23 | LLM proxy outbound destination allowlisting, strict blocking of internal metadata and private RFC 1918 IP addresses. |

---

## 7. Verification & Signoff Checklist

* **Pre-Deployment Audit:** Automated verification of all 27 security controls prior to capstone demo freeze.
* **Secret Hygiene:** Confirmation that `.env` is absent from git tracking and `.env.example` contains variable names only.
* **MicroVM Boundary:** Verification that microVM processes run with unprivileged UID inside isolated chroot jailers without host network bridge access.
* **Protocol for Scope Changes:** Any security architecture or scope modifications must be formally submitted and documented via `/change`.

