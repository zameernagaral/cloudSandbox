# Change Specification: Hero Localized Text Contrast Mask (Fix 1 of 3)

## 1. Goal (One Sentence)
Add a localized contrast mask behind the hero headline and subhead in `dashboard/src/components/hero/HeroChamber.tsx` so typography is crisply legible without competing with the glowing code lines in the background video.

## 2. Classification
**HERO / LOOK** — refining the hero presentation layer to guarantee WCAG AAA text contrast against the ambient 3D video.

## 3. Session Context
This is **Fix 1 of 3** from the critique:
- **Fix 1 (Current Session):** Localized contrast mask behind hero text block.
- **Fix 2 (Next Session):** Asymmetric technical breakdown for Section 2 (replacing 3 identical cards).
- **Fix 3 (Subsequent Session):** Static poster default on mobile viewports to prevent video aborts.

## 4. Documentation Status
- `docs/HERO.md`: Updated Section 4 to specify the localized text contrast scrim and legibility bounds.
- `docs/TOKENS.md`: Color tokens referenced for high-contrast chalk white (`#F1F5F9`) and deep obsidian (`#0B0D13`).

## 5. File Boundaries
### Exact Files Allowed to Edit:
- `docs/HERO.md`
- `dashboard/src/components/hero/HeroChamber.tsx`

### Files That Must NOT Be Touched:
- `control-plane/**` (all backend Python files, database, APIs)
- `dashboard/src/api/**`
- `dashboard/src/pages/**`
- `dashboard/src/components/demo/**`
- `docs/SECURITY.md`, `docs/TOKENS.md`, `docs/WIREFRAMES.md`

## 6. Blast Radius
- Restricted exclusively to the centered text wrapper (`div.relative.z-10`) inside `dashboard/src/components/hero/HeroChamber.tsx`.
- No impact on route navigation, interactive simulator controls, or backend services.

## 7. Failure States & Edge Cases
1. **Background Aesthetics:** Mask must not be a flat opaque rectangle; it uses a soft radial/conical obsidian blend (`bg-[#0B0D13]/70 backdrop-blur-[2px] rounded-lg p-6 sm:p-8 max-w-3xl mx-auto`) so the 3D code plane remains clearly visible on all sides.
2. **Mobile Scaling:** Mask adapts responsively without clipping text on 390px viewports.
3. **Reduced Motion:** Fully compatible; purely CSS layout and backdrop filter.

## 8. Acceptance Tests
1. Subhead text (*"Contain untrusted LLM tool loops on your own Linux hardware..."*) is easily readable over the video without straining.
2. The 3D isometric code block and particle field remain visible around the text perimeter.
3. Bottom-right terminal anchor position remains unchanged and functional.
4. `npm run type-check` and `npm run build` pass with 0 errors.
5. Unit tests (`npm test`) pass.

## 9. Rollback Procedure
Run `git checkout dev -- dashboard/src/components/hero/HeroChamber.tsx docs/HERO.md`.
