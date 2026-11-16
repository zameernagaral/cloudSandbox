# Change Specification: End-to-End Dynamic Control Plane, Live CLI Sync, & User-Friendly Faculty UX

## 1. Goal (One Sentence)
Make the entire Cloud Sandbox stack (`control-plane` API on port 8000, `sandboxctl` CLI, and React `dashboard`) run dynamically end-to-end with persistent SQLite state, real-time killswitch enforcement, and an approachable, high-legibility interface tailored for faculty evaluation.

## 2. Classification
**FULL-STACK ARCHITECTURE & USABILITY** — integrating persistent backend state, working CLI automation, and calm, high-contrast UI ergonomics.

## 3. Scope & Key Changes

### A. Control Plane Backend (`control-plane/`)
- Runs natively on local `python3` with built-in SQLite persistence (`control-plane/cloud_sandbox.db`), in-memory async Redis pub/sub (`app/db/redis_client.py`), and PBKDF2-HMAC + HS256 JWT/API-key auth (`app/services/auth.py`, `app/middleware/auth.py`).
- Added built-in Virtual Firecracker & Real-Time Killswitch Engine (`app/services/runtime.py`) backing `/api/v1/sandboxes/{id}/run`, `/exec`, `/logs`, `/pause`, `/resume`, and `/demo/launch`.
- Auto-seeds default admin operator (`usr-student-01`, CLI key `sk-live-cloud-sandbox-admin-key`), active KVM host node (`host-01`), 3 killswitch policies, and initial demo microVMs.
- Preserves all RequestContext security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`), 1 MB payload limit (`413`), and `$`/`.` operator rejection (`422`).

### B. `sandboxctl` CLI (`cli/sandboxctl/`, `./sandboxctl`)
- Pre-configured default auth & endpoint (`sk-live-cloud-sandbox-admin-key` → `http://localhost:8000`).
- Added root executable wrapper `./sandboxctl`.
- Added/upgraded commands: `status`, `login`, `list`, `deploy --policy --scenario --watch`, `run`, `pause`, `resume --max-cost`, `destroy`, `logs`, `exec`, `host init`, `host list`.

### C. User-Friendly Dynamic Dashboard (`dashboard/`)
- **Typography & Contrast (`tailwind.config.js`, `src/styles/tokens.css`, `src/index.css`):** Raised minimum font sizes (`text-2xs`/`3xs` bumped from 10px to 12px), brightened secondary text (`#B0C0D4`), strengthened panel borders (`#334155`), enlarged buttons/controls (`min-h-[40px]`), and added `.meter-bar` styles.
- **Real API Integration (`src/api/client.ts`, `src/store/auth.ts`, `vite.config.ts`):** Sends all requests to live backend `/api/v1` first (with automatic preview proxy to port 8000) and falls back cleanly only when offline.
- **Calm Landing & Simulator (`HeroChamber.tsx`, `InteractiveSimulator.tsx`, `Landing.tsx`):** Removed disorienting scroll-flying FLIP terminal transform, added clear 1-2-3 evaluation guide, synced simulator runs with `/api/v1/demo/launch`, added **"Open Live Fleet Dashboard"** CTA and one-click Copy buttons for CLI commands.
- **Fleet Dashboard & VM Console (`AppLayout.tsx`, `Dashboard.tsx`, `SandboxDetail.tsx`, `Settings.tsx`):** Live polling every 1.0–1.5s to mirror CLI changes immediately, live backend connection status pill, per-card Run/Pause/Resume/Destroy controls, Quick Workload & Shell Command toolbar in VM Console, and copyable CLI key/commands in Settings.

## 4. Acceptance Verification
1. All 7 backend security assertions pass via FastAPI `TestClient`.
2. `control-plane` runs cleanly on `http://localhost:8000`.
3. `./sandboxctl status`, `list`, `deploy --scenario loop --watch`, `resume`, `destroy` communicate dynamically with port 8000 and persist across requests.
4. `cd dashboard && node --test tests/*.test.mjs && npm run type-check && npm run build` pass cleanly.
5. Playwright verification at `1440x900` and `390x844` confirms `/`, `/dashboard`, `/sandbox/:id`, and `/settings` render cleanly with synced live backend data.
