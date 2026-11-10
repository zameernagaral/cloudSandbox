# Change Specification: Hero Full-Bleed Ambient Background (Alternative B)

## 1. Goal (One Sentence)
Convert the landing page hero from a split 2-column card layout to a full-bleed ambient background with centered text and a clean horizontal telemetry bar (Alternative B in `docs/WIREFRAMES.md`), removing the standalone right-hand chamber block and eliminating glowing AI-slop gradients.

## 2. Classification
**HERO / LAYOUT of one section** — implementing Alternative B from `docs/WIREFRAMES.md` (Full-Bleed Ambient Horizon with Centered Telemetry Deck) for the hero section.

## 3. Split Notice
The user request contained multiple changes ("remove that block only add hero as a background **and** change the styling no purple, or orange no gradient"):
- **Change 1 (Current):** Hero full-bleed background layout, removing the 2-column block, with clean monochrome styling on the hero.
- **Change 2 (Next):** Global token & style audit to purge purple/orange accents and gradients across all secondary landing sections and cards.

## 4. Documentation Status
- `docs/WIREFRAMES.md`: Authoritative specification for Section 1 Alternative B.
- `docs/HERO.md`: Updated Section 4 to reflect full-bleed background mode.
- `docs/TOKENS.md`: Design tokens referenced for crisp 1px borders and high-contrast typography.

## 5. File Boundaries
### Exact Files Allowed to Edit:
- `docs/HERO.md` (documenting Alternative B active lifecycle)
- `dashboard/src/components/hero/HeroChamber.tsx` (refactored to serve as full-bleed background and horizontal telemetry bar)
- `dashboard/src/pages/Landing.tsx` (restructuring hero section to centered layout over full-bleed background)

### Files That Must NOT Be Touched:
- `control-plane/**` (all backend Python files, database, auth, APIs)
- `dashboard/src/api/**`
- `dashboard/src/pages/Auth.tsx`
- `dashboard/src/pages/Dashboard.tsx`
- `dashboard/src/pages/RogueAgentDemo.tsx`
- `dashboard/src/pages/SandboxDetail.tsx`
- `docs/SECURITY.md`, `docs/COPY.md`, `docs/TOKENS.md`

## 6. Blast Radius
- Restricted exclusively to the hero section (`<section id="hero">`) inside `dashboard/src/pages/Landing.tsx` and its child component `HeroChamber.tsx`.
- No route changes, no backend impact, no shared state changes.

## 7. Failure States & Edge Cases
1. **Reduced Motion (`prefers-reduced-motion: reduce`):** Background video does not attach or autoplay; high-contrast static poster remains as full-bleed background.
2. **Save-Data / Slow Connections:** Video attachment suppressed; static poster image handles the background.
3. **Contrast / Legibility:** Background has a subtle dark obsidian scrim (`rgba(11, 13, 19, 0.78)`) ensuring WCAG AAA legibility for white text without requiring diffuse colored drop-shadows or gradients.
4. **Emergency Stop Button:** Clicking "Pull to freeze" halts background video playback and marks telemetry status as `[FROZEN]`.
5. **Scroll Off-Screen:** `IntersectionObserver` halts video execution when the hero is out of view (0% CPU/GPU).

## 8. Acceptance Tests
1. Hero right-column block card is completely removed.
2. Video/poster spans the entire hero section background edge-to-edge with no purple or orange glowing boxes.
3. Headline, value proposition, CTAs, and horizontal telemetry bar are centered and legible.
4. Emergency stop latch freezes background playback and updates state to "Frozen".
5. TypeScript check (`npm run type-check`) and production build (`npm run build`) pass with 0 errors.
6. Playwright automated check verifies rendering and interaction.

## 9. Rollback Procedure
Run `git checkout dev -- dashboard/src/components/hero/HeroChamber.tsx dashboard/src/pages/Landing.tsx docs/HERO.md`.
