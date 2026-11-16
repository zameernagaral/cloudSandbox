# Change Specification: Strict 3-Color Monochrome + Single-Accent UI Overhaul

## 1. Goal (One Sentence)
Simplify the entire Cloud Sandbox web interface to a strict 3-color palette (Deep Obsidian neutrals, Chalk White ink, and one Emerald accent) across all pages and components, eliminating competing rainbow colors (cyan, amber, purple, red) so the UI looks clean, cohesive, and effortless to read.

## 2. Classification
**LOOK** — Visual color consolidation across `docs/TOKENS.md`, CSS variables, Tailwind config, and UI components.

## 3. Doc Edits Plan (To Be Applied After `go`)
- **`docs/TOKENS.md`:** Replace the multi-accent palette (Safety Amber, Containment Red, Cyan, Purple) with a strict 3-color system:
  1. **Neutral Dark Base & Surfaces:** `#090B10` (canvas), `#121620` (cards), `#1A202E` (elevated/hover), `#2A3244` (1px borders).
  2. **Chalk White & Soft Gray Ink:** `#F8FAFC` (headings, primary buttons, key metrics), `#A8B3C5` (secondary descriptions & labels).
  3. **Single Accent (`#10B981` Emerald):** Active/live indicators, operational badges, and primary focus highlights. Frozen/stopped/paused states use clean monochrome high-contrast pills (`bg-white/10 text-ink-primary border-white/25`) instead of extra colors.

## 4. File Boundaries
### Exact Files Allowed to Edit:
- `docs/CHANGE.md`
- `docs/TOKENS.md`
- `dashboard/src/styles/tokens.css`
- `dashboard/tailwind.config.js`
- `dashboard/src/index.css`
- `dashboard/src/components/layout/AppLayout.tsx`
- `dashboard/src/components/hero/HeroChamber.tsx`
- `dashboard/src/components/demo/InteractiveSimulator.tsx`
- `dashboard/src/components/ui/MeterBar.tsx`
- `dashboard/src/components/ui/StatusBadge.tsx`
- `dashboard/src/pages/Landing.tsx`
- `dashboard/src/pages/Dashboard.tsx`
- `dashboard/src/pages/SandboxDetail.tsx`
- `dashboard/src/pages/Settings.tsx`
- `dashboard/src/pages/Auth.tsx`
- `dashboard/src/pages/admin/AdminPanel.tsx`
- `dashboard/src/pages/admin/AdminLogin.tsx`

### Files That Must NOT Be Touched:
- `control-plane/**` (backend API, SQLite store, virtual runtime)
- `cli/**` (`sandboxctl`)
- `dashboard/src/api/**`
- `dashboard/src/store/**`
- `dashboard/tests/**`
- `docs/SECURITY.md`, `docs/COPY.md`, `docs/HERO.md`, `docs/WIREFRAMES.md`

## 5. Blast Radius
- Strictly visual CSS tokens, Tailwind classes, and component JSX styling across `dashboard/src/`.
- Zero changes to routing, API calls, WebSocket streams, or backend permissions.

## 6. Failure States & Edge Cases
1. **State Distinction Without Rainbow Colors:** `RUNNING`, `FROZEN`, and `STOPPED` badges must remain instantly distinguishable using Emerald (`RUNNING`) vs. solid inverted Chalk White (`FROZEN`) vs. muted border pill (`STOPPED`), plus clear text labels.
2. **WCAG AA/AAA Contrast:** `#F8FAFC` on `#090B10`/`#121620` (>15:1) and `#A8B3C5` on `#121620` (>7:1) must remain strictly legible on projectors and mobile screens.
3. **Destructive Actions:** `Destroy` / `Emergency Stop` remain unmistakably labeled with clear text + subtle monochrome/white emphasis without introducing extra neon colors.

## 7. Acceptance Tests
1. `grep -rnE "amber|cyan|purple|indigo|violet|blue-|pink" dashboard/src/` returns zero competing accent classes on UI components (excluding xterm ANSI terminal color definitions if needed).
2. `cd dashboard && node --test tests/*.test.mjs && npm run type-check && npm run build` pass with 0 errors.
3. Playwright verification at `1440x900` and `390x844` confirms `/`, `/dashboard`, `/sandbox/:id`, and `/settings` render cleanly in the 3-color palette with zero horizontal overflow.

## 8. Rollback Procedure
Run `git checkout dev -- docs/TOKENS.md docs/CHANGE.md dashboard/`.
