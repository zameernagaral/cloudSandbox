# Design Tokens: Cloud Sandbox ("Containment Airlock")

Source: Derived from Direction 1 in [`docs/IDEA.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/IDEA.md) and teardowns in [`docs/REFERENCES.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/REFERENCES.md).  
Aesthetic: Industrial containment bulkhead — rugged precision, authentic mechanical instrumentation, zero decorative fluff.

---

## 1. Colour

### Palette (Named Hex Values)
* **`--color-bg-base`**: `#0B0D13` (Deep Obsidian Void — the main page background)
* **`--color-surface-bulkhead`**: `#161B26` (Armored Slate — containment panel cards and terminal backgrounds)
* **`--color-surface-elevated`**: `#1E2536` (Elevated Steel — hover states, interactive dropdowns, and drawer trays)
* **`--color-rule-frame`**: `#2B3448` (Structural Chisel Rule — 1px division rules and panel containment boundaries)
* **`--color-ink-primary`**: `#F1F5F9` (Chalk White — high-contrast headings, terminal stdout, and key telemetry numbers)
* **`--color-ink-muted`**: `#94A3B8` (Industrial Steel Gray — labels, metadata descriptions, and socket paths)
* **`--color-signal-hazard`**: `#F59E0B` (Safety Amber — 2% to 4% screen budget; warning caps, armed killswitches, active cost burn)
* **`--color-signal-breach`**: `#EF4444` (Containment Red — reserve emergency accent; tripped killswitches, OOM alerts, destroyed VMs)

### Usage Rules
1. Background and surface colors must never use generic pure black (`#000000`) or flat navy (`#1E1E2E`); use `#0B0D13` to provide depth without washed-out grays.
2. The hazard accent (`#F59E0B`) is restricted to at most 2% to 5% of the total screen real estate (only for live alert meters, arming toggles, and status badges).
3. Every card and terminal panel must be framed with `--color-rule-frame` (`#2B3448`) to give the structural feel of bolted steel bulkheads.

### Contrast Verification Matrix
All pairs meet WCAG AA standards (minimum 4.5:1 for body text, 3:1 for large text and UI controls):

| Foreground Color | Background Color | Calculated Ratio | WCAG Compliance |
|---|---|---|---|
| `--color-ink-primary` (`#F1F5F9`) | `--color-bg-base` (`#0B0D13`) | **17.6:1** | Passes AAA (Normal & Large Text) |
| `--color-ink-primary` (`#F1F5F9`) | `--color-surface-bulkhead` (`#161B26`) | **15.8:1** | Passes AAA (Normal & Large Text) |
| `--color-ink-muted` (`#94A3B8`) | `--color-bg-base` (`#0B0D13`) | **7.7:1** | Passes AAA Normal Text (4.5:1+) |
| `--color-ink-muted` (`#94A3B8`) | `--color-surface-bulkhead` (`#161B26`) | **6.9:1** | Passes AAA Normal Text (4.5:1+) |
| `--color-signal-hazard` (`#F59E0B`) | `--color-bg-base` (`#0B0D13`) | **8.9:1** | Passes AAA Large/UI (3:1+) & AA Normal |
| `--color-signal-hazard` (`#F59E0B`) | `--color-surface-bulkhead` (`#161B26`) | **8.0:1** | Passes AAA Large/UI (3:1+) & AA Normal |
| `--color-signal-breach` (`#EF4444`) | `--color-surface-bulkhead` (`#161B26`) | **4.7:1** | Passes AA Normal Text & AAA UI |

---

## 2. Typography

### Type Families (Max 2 + 1 Telemetry Mono)
* **Display & Structural Headings:** `Space Grotesk`, sans-serif (chiseled mechanical geometry).
* **Body & Interface Elements:** `IBM Plex Sans`, sans-serif (authentic computing system clarity; replaces generic Inter).
* **Telemetry & Console Logs:** `JetBrains Mono` or `Fragment Mono`, monospace (rigid tabular metrics, socket addresses, memory offsets).

### Type Scale (Base 16px, Major Third Ratio 1.25)
* **`--text-2xs` (10px / 0.625rem):** Micro-telemetry labels, vCPU core index (`font-mono`, `font-semibold`, uppercase, tracking +0.08em).
* **`--text-xs` (12px / 0.75rem):** Timestamp logs, socket paths, metric units (`line-height: 1.4`).
* **`--text-sm` (14px / 0.875rem):** Form labels, secondary metadata, table headers (`line-height: 1.45`).
* **`--text-base` (16px / 1.0rem):** Main body copy, terminal active input line (`line-height: 1.55`).
* **`--text-lg` (20px / 1.25rem):** Card titles, containment bulkhead section headers (`font-medium`, `line-height: 1.3`).
* **`--text-xl` (25px / 1.5625rem):** Dashboard primary view headers (`font-semibold`, `line-height: 1.25`).
* **`--text-2xl` (31.25px / 1.95rem):** Page overview titles (`font-bold`, `line-height: 1.2`).
* **`--text-display` (Fluid clamp):** `clamp(2rem, 1.5rem + 2.5vw, 2.75rem)` (32px to 44px) for hero title (`font-bold`, tracking -0.025em, `line-height: 1.15`).

---

## 3. Space & Layout

### 4px Base Scale
* `--space-1`: 4px
* `--space-2`: 8px
* `--space-3`: 12px
* `--space-4`: 16px
* `--space-5`: 20px
* `--space-6`: 24px
* `--space-8`: 32px
* `--space-10`: 40px
* `--space-12`: 48px
* `--space-16`: 64px

### Layout Structure & Grid
* **App Shell Layout:** Fixed left containment navigation rail (64px collapsed, 240px expanded) paired with an asymmetric 12-column workspace.
* **Asymmetric 12-Column Grid:**
  * **Columns 1 to 4 (33% width):** Real-time Sandbox Controls, Emergency Killswitch Console, Active Quota Gauge.
  * **Columns 5 to 12 (67% width):** Live Xterm.js Terminal Stream, Kernel Ring Buffer (`dmesg`), vCPU/RAM Burn Meters.
* **Gutters:** 16px on mobile (<768px), 24px on desktop (≥1024px).
* **Max Containment Width:** 1280px (`max-w-7xl`), centered with 24px inline padding.
* **Section Rhythm:** 48px (`--space-12`) vertical separation on mobile; 80px vertical separation on desktop.

---

## 4. Shape & Borders

### Border Radii
* **`--radius-none` (0px):** Strictly reserved for data table rows, live terminal frames, and status meter bars (justification: reflects raw unrounded terminal screens).
* **`--radius-sm` (4px):** Interactive chips, code badges, and metric pills (justification: tight machine cornering resembling stamped metal labels).
* **`--radius-md` (6px):** Primary bulkhead cards and container drawers (justification: subtle industrial chamfer that avoids playful consumer roundness).
* **`--radius-full` (9999px):** Exclusively reserved for status indicator dots, circular avatars, and the physical toggle switch handle.

### Structural Rule Weights
* **`--rule-thin` (1px):** Standard bulkhead borders and internal grid dividers (`border border-[#2B3448]`).
* **`--rule-focus` (2px):** Active keyboard focus rings and selected containment tab outlines (`outline 2px solid #F59E0B`).
* **`--rule-hazard` (4px):** Hazard boundary striping on the emergency stop killswitch card.

### Shadow & Elevation
* **`--shadow-bulkhead`:** `0 1px 3px 0 rgba(0, 0, 0, 0.5)` (subtle grounding plate shadow; avoids diffuse blurry elevation).
* **`--shadow-glow-amber`:** `0 0 16px rgba(245, 158, 11, 0.18)` (illuminates the armed killswitch toggle).
* **`--shadow-glow-red`:** `0 0 20px rgba(239, 68, 68, 0.28)` (flashes during triggered runaway spend breach).

---

## 5. Motion

* **Durations:**
  * **`--motion-fast` (120ms):** Button presses, badge state toggles, cursor hover highlights.
  * **`--motion-normal` (240ms):** Drawer expansion, terminal window collapse, dropdown reveals.
  * **`--motion-slow` (480ms):** Killswitch latch drop, microVM freeze animation, breach notification slide-in.
* **Single Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (mechanical ease-out: brisk initial movement with decisive deceleration, mimicking spring-loaded hardware latches).
* **Max Travel Distance:** 16px (no floaty page-scale transitions; elements snap cleanly into position).
* **Reduced Motion Override:** Under `prefers-reduced-motion: reduce`, all transitions drop to `0ms` and animations reduce to immediate opacity switches.

---

## 6. Self-Critique & Anti-Default Refinements

1. **Replaced Generic Default 1 (`Inter` typography):**
   * *Initial Risk:* Reaching for `Inter` for both headings and body text, which makes technical infrastructure look like a generic template.
   * *Refinement:* Adopted `IBM Plex Sans` for body copy and `Space Grotesk` for display headings. `IBM Plex Sans` carries an authentic computing equipment pedigree, giving labels and tables a purposeful machine feel.
2. **Replaced Generic Default 2 (Soft 16px Rounded Cards with Colored Gradient Shadows):**
   * *Initial Risk:* Adopting the common AI "glass-bento" look with 16px rounded borders and diffuse colored drop-shadows.
   * *Refinement:* Tightened container radii to sharp 6px/4px corners and replaced drop-shadows with 1px structural framing rules (`#2B3448`). Added 0px square corners to terminal and telemetry strips to preserve an authentic hardware console character.

