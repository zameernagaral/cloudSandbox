# Change Specification: Asymmetric Technical Architecture Breakdown (Fix 2 of 3)

## 1. Goal (One Sentence)
Redesign Section 2 ("Technical Architecture & Defense-in-Depth") in `dashboard/src/pages/Landing.tsx` to replace the generic 3-card icon grid with an asymmetric, high-density engineering breakdown that showcases KVM hypervisor boundaries, real-time token metering, and egress domain filtering.

## 2. Classification
**LAYOUT / ARCHITECTURE** — transforming SaaS-boilerplate feature cards into an authentic systems-engineering proof layout.

## 3. Session Context
This is **Fix 2 of 3** from the critique:
- **Fix 1 (Previous Session):** Localized contrast mask behind hero text block (Merged into `dev`).
- **Fix 2 (Current Session):** Asymmetric technical breakdown for Section 2 (replacing 3 identical cards).
- **Fix 3 (Next Session):** Static poster default on mobile viewports to prevent video aborts.

## 4. Documentation Status
- `docs/WIREFRAMES.md`: Updated Section 2 to document the 7-col / 5-col asymmetric architecture proof.
- `docs/TOKENS.md`: Utilizing armored slate (`#161B26`), chisel rules (`#2B3448`), and chalk white (`#F1F5F9`).

## 5. File Boundaries
### Exact Files Allowed to Edit:
- `docs/CHANGE.md`
- `docs/WIREFRAMES.md`
- `dashboard/src/pages/Landing.tsx`

### Files That Must NOT Be Touched:
- `control-plane/**` (all backend Python files, database, APIs)
- `dashboard/src/api/**`
- `dashboard/src/components/hero/**`
- `dashboard/src/components/demo/**`
- `docs/SECURITY.md`, `docs/TOKENS.md`, `docs/HERO.md`

## 6. Blast Radius
- Restricted exclusively to `#architecture-proof` inside `dashboard/src/pages/Landing.tsx`.
- No impact on routing, simulator state, or hero playback.

## 7. Layout Specification
- **Desktop (≥1024px):** 12-column asymmetric grid (`lg:grid-cols-12 gap-6`).
  - **Left Column (7 cols):** Deep-dive on **KVM Hypervisor & Kernel Boundary Layer**.
    - MicroVM containment chamber breakdown:
    - `/dev/kvm` hardware virtualization + dedicated Linux 5.10 kernel.
    - Jailer security layers: `chroot` root jail, `cgroups v2` memory/CPU ceilings, `seccomp-bpf` filter blocking 270+ unneeded syscalls.
    - Hardware vsock boundary (`vsock:cid 3:1024`) preventing host networking crosstalk.
    - Visual layer stack: Guest Agent Process → Isolated MicroVM Kernel → Chroot Jailer → Bare-metal KVM Hypervisor.
  - **Right Column (5 cols, stacked):**
    - **Card A (Top): Sub-Second Token Cost Ceiling & Kernel Interceptor**:
      - Real-time token rate limiter stream (`Redis Streams` + host gateway proxy).
      - Sub-second microVM freeze latency (`<50ms` pause trip via Firecracker API).
      - Active metric readout and code/state callout.
    - **Card B (Bottom): Egress Domain Whitelist & Injected Key Proxy**:
      - Outbound API routing matrix:
        - `api.openai.com:443` -> ALLOWED (Injected at host proxy; zero keys on guest disk).
        - `api.anthropic.com:443` -> ALLOWED (Ephemeral AES-256 header injection).
        - `* (RFC 1918 & arbitrary IPs)` -> DROPPED (Immediate RST / kernel packet drop).
- **Mobile (<1024px):** Single-column stacked blocks with clear visual hierarchy.

## 8. Acceptance Tests
1. Section 2 eliminates the 3 identical icon card repetition.
2. Layout renders an asymmetric 7-col / 5-col split on desktop and 1-column on mobile.
3. Accurate systems terminology (KVM, chroot, cgroups v2, seccomp-bpf, vsock CID, Redis Streams token metering, proxy key injection).
4. `npm run type-check` and `npm run build` pass with 0 errors.
5. Unit tests (`node --test tests/*.test.mjs`) pass.
6. Playwright screenshot verification on desktop (1440px) and mobile (390px).

## 9. Rollback Procedure
Run `git checkout dev -- dashboard/src/pages/Landing.tsx docs/WIREFRAMES.md docs/CHANGE.md`.
