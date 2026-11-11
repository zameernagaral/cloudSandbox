# Change Specification: Mobile Static Poster Default (Fix 3 of 3)

## 1. Goal (One Sentence)
Enforce a pure static poster default on mobile viewports (<768px) in `dashboard/src/components/hero/HeroChamber.tsx` by bypassing background video attachment, eliminating mobile video decoding aborts (`net::ERR_ABORTED`) and battery drain.

## 2. Classification
**PERFORMANCE / MOBILE** — eliminating redundant video requests on constrained mobile devices in favor of an instant, crystal-clear static poster.

## 3. Session Context
This is **Fix 3 of 3** from the critique:
- **Fix 1 (Completed & Merged):** Localized contrast mask behind hero text block.
- **Fix 2 (Completed & Merged):** Asymmetric technical breakdown for Section 2 (replacing 3 identical cards).
- **Fix 3 (Current Session):** Static poster default on mobile viewports (<768px).

## 4. Documentation Status
- `docs/HERO.md`: Updated Section 4 to record the pure static poster default for mobile viewports (<768px).
- `docs/CHANGE.md`: Authoritative change tracking and verification plan.

## 5. File Boundaries
### Exact Files Allowed to Edit:
- `docs/CHANGE.md`
- `docs/HERO.md`
- `dashboard/src/components/hero/HeroChamber.tsx`

### Files That Must NOT Be Touched:
- `control-plane/**` (all backend Python files, database, APIs)
- `dashboard/src/api/**`
- `dashboard/src/pages/**`
- `dashboard/src/components/demo/**`
- `docs/SECURITY.md`, `docs/TOKENS.md`, `docs/WIREFRAMES.md`

## 6. Blast Radius
- Restricted exclusively to the video attachment logic in `dashboard/src/components/hero/HeroChamber.tsx`.
- Desktop behavior (>=768px) remains identical, attaching VP9 WebM (`hero-720.webm`) or MP4 (`hero-1080.mp4`).

## 7. Failure States & Edge Cases
1. **Desktop Users:** Must continue to receive seamless ambient video streaming.
2. **Mobile Users:** Must see `hero-poster.png` with 0 visual flash, 0 aborted network requests, and zero decoding overhead.
3. **Save-Data / Reduced Motion:** Continues to be respected across all screen sizes.

## 8. Acceptance Tests
1. On viewports `< 768px`, no network request is initiated for any `.mp4` or `.webm` video file.
2. The static hero poster (`/hero/hero-poster.png`) renders crisply as the background image with high priority.
3. On desktop viewports (>= 768px), video continues to load and play normally.
4. `npm run type-check` and `npm run build` pass with 0 errors.
5. Unit tests (`node --test tests/*.test.mjs`) pass.
6. Playwright network request verification confirms 0 video requests on mobile (390px) and successful video load on desktop (1440px).

## 9. Rollback Procedure
Run `git checkout dev -- dashboard/src/components/hero/HeroChamber.tsx docs/HERO.md docs/CHANGE.md`.
