# Design Ideas: Cloud Sandbox

---

## 1. Eight True Things from the Subject's Own World

1. **The Firecracker Jailer (`/srv/jailer/firecracker/<id>/root`)** — The Linux chroot environment, cgroups, and network namespace boundary that physically locks a microVM into zero-privilege containment.
2. **The VSock Channel (`/run/firecracker.vsock`)** — The zero-network, point-to-point host-to-guest hardware socket bridge used for streaming stdout, stderr, and terminal multiplexing without exposing an external IP.
3. **The Emergency Stop Guard (Physical Killswitch)** — The spring-loaded, yellow-and-black hatched safety cover over a dual-motion toggle switch that requires deliberate physical unlatching before cutting power.
4. **Token Metering Gate & Burn Velocity (`tokens/sec`, `burn $/sec`)** — The financial proxy intercepting prompt/completion token streams, calculating micro-cents per millisecond, and tracking burn acceleration.
5. **The Linux Kernel Ring Buffer (`dmesg` & `/dev/kmsg`)** — The raw, microsecond-timestamped hypervisor log that prints vCPU thread init, hardware interrupts, page faults, and memory cgroup events.
6. **The Memory Cgroup Ceiling (`memory.max` & OOM Killer)** — The unyielding kernel barrier that instantaneously kills execution the millisecond an untrusted process exceeds its allocated RAM.
7. **The Industrial Airlock Chamber** — Monolithic physical isolation bulkheads and interlocks designed to contain explosive pressure differentials and prevent contamination of outer zones.
8. **The "Rogue Agent Loop" Incident Drill** — The defensive benchmark where developers simulate an LLM hallucination loop (recursive tool calls, infinite shell loops) to verify the killswitch trips in under 1,000 milliseconds.

---

## 2. Three Genuinely Different Design Directions

### Direction 1: "Containment Airlock" (The Literal Hardware & Kernel Boundary)
*Literal execution of the core Firecracker microVM isolation thesis.*
* **Concept:** The interface is designed as an armored containment deck. Each microVM is visualised as an isolated, pressurized chamber; the dashboard is the armored observation console. The layout uses industrial mechanical paneling, containment latches, and unambiguous status indicators.
* **Palette Logic:** Monochromatic industrial slate (`#0B0D13` base, `#161B26` bulkhead card surfaces, `#283144` structural framing borders) paired with functional safety accents: **Safety Warning Amber** (`#F59E0B`) for approaching budget thresholds and **Containment Red** (`#EF4444`) for triggered killswitches and frozen VMs. Muted high-readability chalk (`#F1F5F9`) for primary metrics.
* **Type Character:** Monospace-anchored hierarchy. Display headings in a chiseled, architectural technical sans, paired with an authentic terminal monospace (`Fragment Mono` or `JetBrains Mono`) for all resource addresses, socket paths, and state badges.
* **Hero Metaphor:** An interactive "MicroVM Containment Chamber" — a live technical cutaway showing the Firecracker jailer perimeter, active vCPU thread pulses, and a prominent safety-guarded Killswitch toggle ready for manual or automated trip.
* **Aesthetic Risk:** Replaces generic SaaS minimalism with a tactile, heavy-duty industrial aesthetic (structural framing rules, mechanical status latches, high-contrast warning badges).

---

### Direction 2: "Financial Reactor / Real-Time Telemetry Cockpit"
*Derived from the token burn rate, cost-cap velocity, and runaway spend threat.*
* **Concept:** Runaway AI agents are treated like a nuclear reactor trending toward thermal runaway. The UI is an ultra-high-density financial and execution telemetry cockpit (drawing inspiration from satellite ground control and Bloomberg terminals).
* **Palette Logic:** Pitch black cockpit floor (`#08090C`), deep obsidian telemetry wells (`#10131B`), hairline division rules (`#1C2230`). Accented by **Sub-Zero Cyan** (`#06B6D4` healthy flow / cold data) that transitions into **Thermal Orange / Crimson** (`#F97316` / `#DC2626`) as burn acceleration nears the user-defined cost cap.
* **Type Character:** High-density tabular figures (`tnum`) and condensed technical sans. Clean micro-captions with zero letter jitter during real-time millisecond, token-per-second, and USD micro-cent updates.
* **Hero Metaphor:** A real-time "Burn Velocity Horizon": an undulating vector waveform showing token burn velocity per millisecond moving toward a fixed, horizontal "Kill Ceiling". When an agent loops, the spike impacts the ceiling, triggering an instant freeze shockwave.
* **Aesthetic Risk:** Ultra-high informational density with live streaming telemetry on every panel, prioritizing instant operational awareness over relaxing whitespace.

---

### Direction 3: "CAD Wireframe & Engineering Draft"
*Derived from architectural schematics, Firecracker blueprints, and coordinate drafting.*
* **Concept:** The dashboard presents the sandbox platform as a living architectural engineering blueprint — vector lines, coordinate tick marks, memory offset callouts, and system topology diagrams.
* **Palette Logic:** Deep blueprint navy-charcoal (`#090D16`), drafting grid surface (`#111827`), laser-sharp **Drafting White** (`#FFFFFF`) vectors, and **Phosphor Calibration Green** (`#10B981`). Muted wiring blue (`#3B82F6`) for normal connections.
* **Type Character:** Architectural drafting typography. Geometric uppercase labels, coordinate callouts (`X:44, Y:72`), crosshair tick marks, and drafting note callouts.
* **Hero Metaphor:** An interactive topology blueprint of the guest-to-host vsock bridge. Nodes represent the Agent Process, Guest Kernel, VSock Channel, and LLM Metering Proxy. Real-time packet pulses travel along vector pathways; tripping the killswitch visibly breaks the circuit connection.
* **Aesthetic Risk:** Complete departure from conventional cards and drop-shadows; strictly uses 1px drafting lines, coordinate bounds, and schematic nodes.

---

## 3. Direction Stress Tests & AI Default Check

| Direction | Could it work for a different client (e.g. e-commerce / CRM)? | Does it resemble any common AI defaults? |
|---|---|---|
| **1. Containment Airlock** | **No.** Industrial bulkheads, Firecracker jailer indicators, and safety-hatched killswitches make zero sense for an ordinary app. | Rejects cream+serif, avoids neon cyberpunk cliches, and avoids newspaper broadsheet formatting. |
| **2. Financial Reactor** | **No.** Grounded strictly in microVM token burn acceleration, vCPU clocking, and sub-second execution freezes. | Avoids generic SaaS pastel cards; replaces marketing fluff with live tabular telemetry. |
| **3. CAD Wireframe** | **Low probability.** Blueprint styling is rare in web apps, but without Firecracker terminology it could theoretically fit an IoT tool. | Avoids generic dark-mode gradients, though vector crosshairs must be restrained to stay functional rather than decorative sci-fi. |

---

## 4. Recommendation

**Direction 1 ("Containment Airlock") with selective high-density telemetry from Direction 2.**

* **Rationale:** The defining thesis of Cloud Sandbox is **safety from runaway AI agents via Firecracker isolation and sub-second killswitches**. Direction 1 embodies this physical promise immediately. When a mentor, faculty reviewer, or engineer views the platform, seeing an authentic containment chamber with an unmistakable physical-style killswitch instantly demonstrates why Firecracker microVMs are fundamentally more secure than standard Docker containers.

