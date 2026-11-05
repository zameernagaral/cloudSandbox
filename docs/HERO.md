# Hero Specification: Cloud Sandbox ("Containment Airlock")

Source: [`docs/WIREFRAMES.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/WIREFRAMES.md), [`docs/TOKENS.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/TOKENS.md), [`docs/COPY.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/COPY.md), and verified hero assets.

---

## 1. The One Shot: The Autonomous Code Plane in Containment

* **Subject Concept:** The interface visualizes the core promise of Cloud Sandbox — an autonomous AI agent generating and executing code within an isolated Firecracker microVM, bounded by a rigid hypervisor containment deck.
* **Start State:** In the right-pane viewport, an ethereal, three-dimensional plane of syntax lines (`hero-poster.png`) floats inside the dark obsidian hypervisor void. The code glows in icy cyan and subtle lavender, actively breathing and running instructions. Overlaid above it are crisp 1px hardware telemetry rules (`--color-rule-frame` `#2B3448`), live vCPU/RAM meters, and a calm token burn velocity counter (`$0.0034/s`).
* **The Transition & End State:** As the user interacts or watches the rogue agent drill, the code execution is framed by the containment deck. When the agent exceeds its $0.01 threshold, the mechanical killswitch indicator trips, freezing the microVM via the hardware vsock bridge, while the host system remains completely untouched.

---

## 2. Chosen Technique: Ambient Loop Film with Scroll-Scrub Support

### Why Ambient Loop Film Fits
You have supplied verified, bespoke footage specifically tailored to this product:
1. **Photorealistic Depth with Zero CPU Computation:** The 3D isometric floating code block is pre-rendered at cinema quality, eliminating all client-side WebGL compilation, shader crashes, or GPU thermal throttling.
2. **Deterministic Performance:** By using the optimized 1.0 MB WebM asset (`hero-720.webm`) and 1.7 MB scrub asset (`hero-scrub.mp4`), performance is 100% predictable across low-end laptops and mobile phones.
3. **Perfect LCP Pairing:** `hero-poster.png` (1920×1080) matches the exact opening frame of the video, allowing the browser to achieve an instant, seamless paint without layout shift before the video stream attaches.

### Why the Other Techniques Were Superseded
1. *Interactive 3D object (Three.js / WebGL):* Recreating this floating glowing code geometry with three.js r128 would require a 600 KB+ runtime and continuous GPU shader passes that drain battery on developer laptops.
2. *Shader / particle field:* Raw fragment shaders cannot match the authored typographical syntax detail captured in the master video without extreme code complexity.
3. *Scroll-scrubbed only:* Full scroll hijacking frustrates developers reviewing technical documentation; having ambient loop as default with scrub capability on mobile provides the best of both worlds.
4. *Static kinetic type only:* Lacks the dimensional depth and visual excitement of the 3D code plane floating in microVM cyberspace.

---

## 3. Handcrafted Asset Inventory

| Asset Name | Path | Format & Codec | Dimensions | File Size | Role & Usage |
|---|---|---|---|---|---|
| **Poster (LCP)** | `hero-poster.png` | PNG (sRGB) | 1920 × 1080 | 507 KB | **Primary LCP element.** Preloaded in `<head>` with `fetchpriority="high"`. Instant static fallback. |
| **WebM Loop** | `hero-720.webm` | WebM (VP9) | 1280 × 720 | 1.0 MB | **Default web stream.** Highest compression efficiency for modern Chromium, Firefox, and Safari 16+. |
| **MP4 High-Res** | `hero-1080.mp4` | MP4 (H.264) | 1920 × 1080 | 1.8 MB | **Desktop high-DPI fallback.** Crisp rendering on large 1440p / 4K external displays. |
| **Mobile / Scrub** | `hero-scrub.mp4` | MP4 (H.264) | 960 × 540 | 1.7 MB | **Compact mobile stream.** Half-resolution asset for mobile viewports and low-bandwidth clients. |
| **Source Master** | `hero-src/Clip.mp4` | MP4 | 1920 × 1080 | 4.7 MB | Source raw render archive. |

---

## 4. Behaviour & Runtime Lifecycle

* **Desktop (1440px):**
  * Sits in Columns 6 to 12 (7-column deck, `min-h-[420px]`).
  * Video plays seamlessly behind an absolute-positioned semantic HTML telemetry overlay with `muted`, `playsinline`, `loop`, and `autoplay`.
  * Real-time hardware readouts (vCPU, RAM, burn velocity, vsock path) and the emergency stop latch float directly above the video using `--color-surface-bulkhead` glass panels (`rgba(22, 27, 38, 0.85)`).
* **Mobile (390px):**
  * Stacks below the headline at 100% container width with an explicit 16:9 aspect ratio (`aspect-video`).
  * Uses `hero-scrub.mp4` or stays on `hero-poster.png` to conserve mobile data.
* **First Load (LCP Optimization):**
  * The `hero-poster.png` displays immediately with the initial HTML paint (<50ms).
  * The video attaches dynamically after `DOMContentLoaded` or through native `<video poster="hero-poster.png">`, guaranteeing zero visual flash.
* **Scroll Behaviour:**
  * An `IntersectionObserver` monitors the hero container: when the user scrolls down to read the architecture proof, the video automatically pauses, consuming **0% CPU** while off-screen.
* **Cursor & Hover:**
  * Hovering over the containment deck reveals subtle border luminescence (`--shadow-glow-amber`), highlighting the active isolation perimeter.

---

## 5. Text Over the Hero (Real HTML Copy from `docs/COPY.md`)

All typography is rendered in real, selectable HTML text and positioned via CSS grid/flex layers above the video container. **Zero text is baked into the video.**

* **Chamber Header:**
  * Identifier: `Containment chamber #vm-demo-01`
  * Status Pill: `Running`
* **Telemetry Matrix:**
  * `vCPU allocation` (`2 Cores (42%)`)
  * `RAM allocation` (`512 MB (68%)`)
  * `Burn velocity` (`$0.0034/sec`)
  * `VSock path` (`/run/fc-01.sock`)
* **Terminal Eyebrow:**
  * `Live stdout (/bin/bash via vsock)`
* **Emergency Stop Control:**
  * Label: `Emergency stop`
  * Action: `Pull to freeze`

---

## 6. Failure States & Resiliency

1. **JavaScript Disabled (`<noscript>`):** The `<video>` tag's native `poster="hero-poster.png"` renders the complete visual scene with full HTML overlay telemetry.
2. **Slow Network (2G/3G / High Latency):** If network speed is under 1 Mbps (via `navigator.connection`), the video source is not attached; the client stays on the lightweight cached poster image.
3. **Save-Data Header (`Save-Data: on`):** When the user has data saver enabled, video autoloading is suppressed, saving 1.0 MB of bandwidth.
4. **Reduced Motion (`prefers-reduced-motion: reduce`):** Autoplay is disabled; the static poster frame is shown without motion or flicker.
5. **Video Playback Error:** If the media fails to decode, the `onerror` event seamlessly maintains `hero-poster.png` as a full-bleed background with no broken media indicators.

---

## 7. Performance & Quality Budgets

* **Mobile LCP:** **Under 1.8 seconds** using `hero-poster.png` as the high-priority LCP image.
* **Desktop Asset Weight:** Exactly **1.0 MB** (`hero-720.webm`) on modern browsers; 1.8 MB fallback on legacy browsers.
* **Mobile Asset Weight:** Capped at **507 KB** (poster only) under data-saver, or 1.7 MB for the 540p stream.
* **CLS (Cumulative Layout Shift):** **0.00** strictly enforced via fixed aspect ratio container (`aspect-video` / `min-h-[420px]`).

---

## 8. Cheaper Fallback Hero (Static Poster + Pure CSS)

If video playback is not possible or blocked by client policy:
* **The Static Fallback:** Displays `hero-poster.png` framed inside the `--color-rule-frame` (`#2B3448`) bulkhead card with subtle dark vignette gradients.
* **The Semantic Overlay:** Displays the live HTML telemetry readouts and the Safety Amber emergency stop button identically.
* **Visual Result:** The page looks completely finished, intentional, and authoritative, with zero visual degradation.
