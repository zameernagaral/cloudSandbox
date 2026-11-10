# Change Specification: Integrate Real Hero Chamber into Landing Page

## 1. Goal (One Sentence)
Replace the static hero placeholder in `dashboard/src/pages/Landing.tsx` with the real, interactive Containment Chamber component built in `/hero` (ambient video loop, instant static LCP poster fallback, real HTML telemetry matrix, and emergency killswitch latch).

## 2. Classification
**FRONTEND FEATURE** — integrating the verified hero technique from `docs/HERO.md` and `docs/WIREFRAMES.md` into the primary React application.

## 3. Documentation Status
- `docs/HERO.md`: Authoritative specification for the chamber behavior, assets, and fallback rules.
- `docs/WIREFRAMES.md`: Authoritative specification for Section 1 (Alternative A: 5-col statement + 7-col chamber deck).
- `docs/COPY.md`: Verified UI copy for telemetry metrics, status pills, and killswitch labels.
- `docs/TOKENS.md`: Color tokens (`--color-surface-bulkhead`, `--color-rule-frame`, `--color-signal-hazard`, etc.).

## 4. File Boundaries
### Exact Files Allowed to Edit:
- `dashboard/src/components/hero/HeroChamber.tsx` (new component encapsulating the chamber)
- `dashboard/src/pages/Landing.tsx` (replacing the placeholder deck with `<HeroChamber />`)
- `dashboard/public/hero/*` (copying the 4 verified hero media assets from `web/public/hero/`)
- `dashboard/index.html` (adding `<link rel="preload">` for `hero-poster.png`)

### Files That Must NOT Be Touched:
- `control-plane/**` (all backend Python files, database, auth, security APIs)
- `dashboard/src/api/**`
- `dashboard/src/pages/Auth.tsx`
- `dashboard/src/pages/Dashboard.tsx`
- `dashboard/src/pages/RogueAgentDemo.tsx`
- `dashboard/src/pages/SandboxDetail.tsx`
- `docs/SECURITY.md`, `docs/TOKENS.md`, `docs/COPY.md`, `docs/HERO.md`

## 5. Blast Radius
- `HeroChamber.tsx` is only imported by `dashboard/src/pages/Landing.tsx`.
- `Landing.tsx` is mounted at route `/` in `dashboard/src/App.tsx`.
- No backend endpoints, API clients, authentication flows, or shared global state stores are affected.

## 6. Failure States & Edge Cases
1. **JavaScript Disabled / SSR Fallback:** Native `poster="/hero/hero-poster.png"` and static HTML telemetry remain visible.
2. **Reduced Motion (`prefers-reduced-motion: reduce`):** Autoplay is disabled; video remains unattached/paused on the static poster frame.
3. **Save-Data / Slow Network:** Detected via `navigator.connection`; suppresses video attachment to protect user bandwidth.
4. **Video Decode Failure (`onerror`):** Gracefully maintains the poster as a full-bleed background and shows a fallback notice without broken media icons.
5. **Emergency Stop Action:** Clicking "Pull to freeze" pauses video playback, locks the button, updates the status badge to "Frozen", and displays the `$0.0102` trip stamp.
6. **Scroll Off-Screen:** `IntersectionObserver` pauses video playback when scrolled out of view to consume 0% CPU.

## 7. Acceptance Tests
1. **Visual & Behavioral Verification:**
   - On desktop (≥1024px), the chamber renders in the right 7 columns with minimum height 420px.
   - On mobile (390px), the chamber renders at full width with a clean 16:9 aspect ratio.
   - Poster image renders immediately with zero layout shift (CLS = 0.00).
   - Video attaches after idle/load event and plays muted in loop.
   - Emergency pull-to-freeze button halts video and updates telemetry state.
2. **Automated Verification:**
   - Vitest unit tests in `dashboard/` pass (`npm test` / `npm run build`).
   - Playwright check confirms responsive display and fallback states.

## 8. Rollback Procedure
Run `git checkout dev -- dashboard/src/pages/Landing.tsx dashboard/src/components/hero/ dashboard/public/hero/` and remove untracked assets.

