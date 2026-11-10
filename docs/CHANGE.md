# Change Specification: Integrate Interactive Demo into Home Page with Scroll-Expanding Terminal

## 1. Goal (One Sentence)
Embed the interactive Rogue Agent Simulator directly into the home page using a scroll-driven expanding terminal transition from the hero background, and redirect the standalone `/demo` route to the home page demo section.

## 2. Classification
**FRONTEND FEATURE or FLOW** — combining the hero ambient stage with the interactive simulator flow on the landing page, and redirecting `/demo` to `/#demo`.

## 3. Documentation Status
- `docs/WIREFRAMES.md`: Updated Section 1 to document the scroll-expanding terminal stage transitioning from the hero into the full interactive simulation console.
- `docs/COPY.md`: UI copy for scenario controls, telemetry metrics, and terminal logs aligned with existing specifications.
- `docs/TOKENS.md`: Design tokens for industrial slate surfaces and crisp 1px borders applied throughout.

## 4. File Boundaries
### Exact Files Allowed to Edit:
- `docs/WIREFRAMES.md`
- `dashboard/src/App.tsx` (redirect `/demo` route to `/#demo` on home page)
- `dashboard/src/components/demo/InteractiveSimulator.tsx` (modular simulator component extracted and styled cleanly)
- `dashboard/src/components/hero/HeroChamber.tsx` (scroll-connected terminal preview layer)
- `dashboard/src/pages/Landing.tsx` (integrating scroll-driven expanding terminal stage and simulator section)
- `dashboard/src/pages/RogueAgentDemo.tsx` (deprecated or re-exporting redirect)

### Files That Must NOT Be Touched:
- `control-plane/**` (all backend Python files, database, auth, APIs)
- `dashboard/src/api/**`
- `dashboard/src/pages/Auth.tsx`
- `dashboard/src/pages/Dashboard.tsx`
- `dashboard/src/pages/SandboxDetail.tsx`
- `dashboard/src/pages/Settings.tsx`
- `docs/SECURITY.md`, `docs/TOKENS.md`

## 5. Blast Radius
- Links previously directing to `/demo` (`Launch demo` button in header, `Test run rogue agent` CTA in hero, footer links) now anchor directly to `/#demo` on the home page.
- Home page bundle includes the interactive simulation logic previously loaded on `/demo`.
- No backend API contracts or authenticated routes are altered.

## 6. Failure States & Edge Cases
1. **Reduced Motion (`prefers-reduced-motion: reduce`):** Scroll scaling transforms are disabled; the terminal renders at full 100% static width without scale transitions.
2. **Mobile Viewports (<768px):** Terminal scales responsively to fit 100% viewport width with horizontal overflow containment on log lines.
3. **Scroll Interpolation:** Scale smoothly clamps between initial hero preview (0.85 scale / compact view) and full deck (1.0 scale) based on scroll offset, preventing visual jitter.
4. **Direct URL Access (`/demo`):** Automatically redirects to `/#demo` on the home page and smooth-scrolls to the active simulator.

## 7. Acceptance Tests
1. Navigating to `/demo` redirects cleanly to the home page (`/` or `/#demo`).
2. Terminal console begins in the hero viewport in front of the ambient background.
3. Scrolling down dynamically enlarges the terminal to full width, revealing the complete interactive simulator (scenario selection, cost cap slider, microVM controls, telemetry meters, and live stdout).
4. All existing landing sections (Header, Architecture Proof, Quick Start, Footer) remain rendered in proper order.
5. `npm run type-check` and `npm run build` pass with 0 errors.
6. `npm test` unit tests pass.

## 8. Rollback Procedure
Run `git checkout dev -- dashboard/ docs/WIREFRAMES.md`.
