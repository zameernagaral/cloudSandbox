# Change Specification: Purge Orange/Gradients for Pure Industrial Slate Look

## 1. Goal (One Sentence)
Refine the design tokens and component styling to eliminate orange/amber buttons, purple accents, and glowing gradients across the application, establishing an authentic, high-contrast industrial monochrome and slate aesthetic.

## 2. Classification
**LOOK** — modifying color tokens in `docs/TOKENS.md`, `dashboard/src/styles/tokens.css`, `dashboard/tailwind.config.js`, `dashboard/src/index.css`, and icon accents in `dashboard/src/pages/Landing.tsx`.

## 3. Documentation Status
- `docs/TOKENS.md`: Updated to deprecate `--color-signal-hazard` as an omnipresent orange accent, replacing primary interactive surfaces with high-contrast chalk white (`#F1F5F9`) and tactile slate (`#1E2536`), with `--color-signal-breach` (`#EF4444`) strictly reserved for freeze/error indicators.
- Removed glowing drop-shadows (`--shadow-glow-amber`) in favor of crisp 1px hairline rules (`--color-rule-frame` / `#2B3448`).

## 4. File Boundaries
### Exact Files Allowed to Edit:
- `docs/TOKENS.md`
- `dashboard/src/styles/tokens.css`
- `dashboard/tailwind.config.js`
- `dashboard/src/index.css`
- `dashboard/src/pages/Landing.tsx` (replacing orange `text-signal-hazard` icons with clean slate/white accents)

### Files That Must NOT Be Touched:
- `control-plane/**` (all backend Python files, database, APIs)
- `dashboard/src/api/**`
- `dashboard/src/pages/Auth.tsx`
- `dashboard/src/pages/Dashboard.tsx`
- `dashboard/src/pages/RogueAgentDemo.tsx`
- `dashboard/src/pages/SandboxDetail.tsx`
- `docs/SECURITY.md`, `docs/COPY.md`, `docs/HERO.md`

## 5. Blast Radius
- Global UI buttons (`.btn-primary`, `.btn-secondary`), input focus outlines, and cards on the landing page.
- Typography and contrast ratios improve to WCAG AAA across all viewport sizes.

## 6. Failure States & Edge Cases
1. **Button Contrast:** Primary buttons transition from orange (`#F59E0B`) to chalk white (`#F1F5F9`) with dark ink text (`#0B0D13`), yielding a contrast ratio of >17:1 against dark backgrounds.
2. **Focus Visibility:** Replaced orange focus rings with crisp 2px chalk white / slate focus rings (`focus:ring-white/40`) to maintain clear keyboard accessibility.
3. **Breach / Error Visibility:** Emergency killswitch and error badges retain containment red (`#EF4444`) for critical safety feedback.

## 7. Acceptance Tests
1. Zero instances of orange buttons or purple flares on the landing page.
2. Header navigation mark, architecture cards, and buttons render in crisp slate/white industrial computing style.
3. Keyboard navigation focus rings remain visible and accessible.
4. `npm run type-check` and `npm run build` pass with 0 errors.
5. Automated test suite passes (`npm test`).

## 8. Rollback Procedure
Run `git checkout dev -- docs/TOKENS.md dashboard/src/styles/tokens.css dashboard/tailwind.config.js dashboard/src/index.css dashboard/src/pages/Landing.tsx`.
