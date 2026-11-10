# Wireframes: Cloud Sandbox ("Containment Airlock")

Source: Built from Direction 1 in [`docs/IDEA.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/IDEA.md), design tokens in [`docs/TOKENS.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/TOKENS.md), and hero film assets in [`docs/HERO.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/HERO.md).  
Aesthetic: Industrial containment bulkhead — tactile mechanical framing, structural 1px rules, high-density telemetry, and zero consumer fluff.

---

## 1. Landing Page Hero: 2 Layout Alternatives (Grounded in `docs/HERO.md`)

### Alternative A (Recommended): Asymmetric Split with Embedded Ambient Video Chamber
* **Concept:** High-contrast value proposition on the left; live containment chamber on the right featuring the ambient looping film of the 3D isometric glowing code plane (`hero-720.webm` / `hero-poster.png`) with real HTML telemetry overlaid.
* **Grid:** 
  * Desktop (1440px): 12-column asymmetric grid. Left 5 cols (statement & action triggers), Right 7 cols (video containment chamber, `min-h-[420px]`).
  * Mobile (390px): Single-column stacked layout. Eyebrow -> Headline -> Body -> Action -> Video chamber (100% width, `aspect-video`).
* **Tokens per Region:**
  * Background: `--color-bg-base` (`#0B0D13`)
  * Bulkhead frame: `--color-surface-bulkhead` (`#161B26`), border `--color-rule-frame` (`#2B3448`, 1px solid)
  * Primary Action: `--color-signal-hazard` (`#F59E0B`), text `#0B0D13`
  * Text: Headings in `Space Grotesk`, body in `IBM Plex Sans`, telemetry in `JetBrains Mono`
* **Eye Path:**
  1. *1st (Focal Point):* The glowing 3D code plane in the video viewport and the Safety Amber pull-to-freeze latch.
  2. *2nd:* Display headline (`Run AI Coding Agents in Firecracker microVMs. With Sub-Second Cost-Cap Killswitches.`).
  3. *3rd:* "Test run rogue agent" action button and sub-second latency proof tag.
* **Scroll Behaviour:** Sticky top nav; when scrolled past the hero, an `IntersectionObserver` automatically pauses the `<video>` element, reducing CPU/GPU usage to 0%.

#### Desktop Wireframe (1440px)
```
+------------------------------------------------------------------------------------------------------------------------+
| [NAV]  [=] CLOUD SANDBOX    Status: [● OPERATIONAL]   mTLS: [VERIFIED]             [Fleet] [Docs] [Sign In] [> LAUNCH] |
+------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                        |
|  <-- COLUMNS 1-5 (Value Proposition & Actions) -->   <-- COLUMNS 6-12 (Ambient Video Chamber Deck: hero-720.webm) -->  |
|                                                                                                                        |
|  [CHIP: Firecracker v1.7.0 kernel isolation]          +----------------------------------------------------------------+  |
|                                                       | CONTAINMENT CHAMBER #vm-demo-01             STATE: [● RUNNING] |  |
|  Run AI Coding Agents in                              +----------------------------------------------------------------+  |
|  Firecracker microVMs.                                | [VIDEO BACKGROUND: hero-720.webm / hero-poster.png]             |  |
|  With Sub-Second Cost-Cap                             |                                                                |  |
|  Killswitches.                                        |      // 3D Isometric Glowing Code Plane Floating in Void //     |  |
|                                                       |      { cyan/lavender syntax loops executing in microVM }       |  |
|  Contain untrusted LLM tool loops on your own Linux   |                                                                |  |
|  hardware. When an agent enters an infinite loop or   +----------------------------------------------------------------+  |
|  exceeds your budget, the killswitch freezes          |  vCPU: 2 Cores (42%)                  RAM: 512 MB (68%)        |  |
|  execution in under 1,000 milliseconds.               |  Burn: $0.0034/sec                    VSock: /run/fc-01.sock   |  |
|                                                       +----------------------------------------------------------------+  |
|  +-----------------------+  +----------------------+  |  LIVE STDOUT: > python3 rogue_agent.py --target=openai/gpt-4o  |  |
|  | [!] TEST ROGUE AGENT  |  | Read Docs [->]       |  |  [INFO] Analyzing AST for 14 workspace files... (184 tokens)   |  |
|  +-----------------------+  +----------------------+  +----------------------------------------------------------------+  |
|  Budget cap: $0.0100 · Latency: Under 850ms freeze    |  EMERGENCY STOP: [/// SAFETY LATCH ARMED ///] [ PULL TO FREEZE] |  |
|                                                       +----------------------------------------------------------------+  |
+------------------------------------------------------------------------------------------------------------------------+
```

#### Mobile Wireframe (390px)
*Redesigned for single-thumb ergonomics: Video scales to clean 16:9 aspect ratio (`aspect-video`), terminal stream condenses to 2 lines, emergency pull latch becomes a prominent full-width bottom touch button.*
```
+---------------------------------------+
| [=] CLOUD SANDBOX   [Sign In] [LAUNCH]|
+---------------------------------------+
| [CHIP: Firecracker v1.7.0 Isolation]  |
|                                       |
| Run AI Coding Agents                  |
| in Firecracker microVMs.              |
| With Sub-Second                       |
| Cost-Cap Killswitches.                |
|                                       |
| Contain untrusted LLM tool loops with |
| zero host exposure. Sub-second freeze.|
|                                       |
| +-----------------------------------+ |
| | [!] TEST ROGUE AGENT ($0.01 CAP)  | |
| +-----------------------------------+ |
|                                       |
| +-----------------------------------+ |
| | CHAMBER #vm-demo-01    [● RUNNING]| |
| +-----------------------------------+ |
| | [VIDEO: hero-scrub.mp4 (16:9)]    | |
| |  { 3D Code Plane Ambient Loop }   | |
| +-----------------------------------+ |
| | CPU: 42%      | RAM: 512MB (68%)  | |
| | Burn: $0.0034/s | Socket: vsock:1024|
| +-----------------------------------+ |
| | STDOUT: python3 rogue_agent.py    | |
| +-----------------------------------+ |
| | [/// ARMED ///] [ PULL TO FREEZE] | |
| +-----------------------------------+ |
+---------------------------------------+
```

---

### Alternative B: Full-Bleed Ambient Horizon with Centered Telemetry Deck
* **Concept:** The glowing code plane video spans the full hero background with a dark vignette overlay (`linear-gradient(to bottom, #0B0D13, transparent 40%, #0B0D13)`), centering the headline and floating the telemetry command deck in the middle.
* **Grid:** 1440px 12-column single-axis centered deck.
* **Eye Path:** 1st: Floating glowing code background -> 2nd: Centered Display Headline -> 3rd: Horizontal Telemetry Command Bar.

#### Desktop Wireframe (1440px)
```
+------------------------------------------------------------------------------------------------------------------------+
| [NAV]  [=] CLOUD SANDBOX        [Sandboxes: 3 Active]   [Burn: $0.0034/s]   [Breaches Blocked: 14]   [Docs] [Launch]   |
+------------------------------------------------------------------------------------------------------------------------+
| [FULL-BLEED BACKGROUND VIDEO: hero-1080.mp4 with dark obsidian gradient overlay]                                       |
|                                                                                                                        |
|                                      HARDWARE-ISOLATED EXECUTION FOR AI AGENTS                                         |
|                          Run untrusted coding loops in Firecracker microVMs on Linux KVM.                              |
|                                                                                                                        |
|                                    [ > LAUNCH DEMO AGENT ]     [ READ DOCS ]                                           |
|                                                                                                                        |
| +--------------------------------------------------------------------------------------------------------------------+ |
| | HORIZONTAL CONTAINMENT DECK: #vm-demo-01                                                        STATUS: [● ARMED] | |
| +--------------------------+--------------------------+--------------------------+-----------------------------------+ |
| | vCPU: 2 Cores (42%)      | RAM: 512 MB (68%)        | BURN: $0.0034/sec        | KILLSWITCH: Sub-second freeze active|
| | Hardware KVM pinned      | Linux cgroup max memory  | Prompt token velocity    | [ PULL EMERGENCY STOP LATCH ]     |
| +--------------------------+--------------------------+--------------------------+-----------------------------------+ |
+------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Core Section Wireframes (Technical Proof & Quick Start)

### Section 2: Technical Architecture & Defense-in-Depth
* **Desktop (1440px):** 3-column grid (`grid-cols-3 gap-6`), 1px chisel framing (`border-rule-frame`), slate bulkheads (`bg-surface-bulkhead`).
* **Mobile (390px):** 1-column stacked cards (`grid-cols-1 gap-4`).
* **Tokens:** Surface `#161B26`, Border `#2B3448`, Icons `#F59E0B`, Text `#F1F5F9` & `#94A3B8`.

```
Desktop (1440px)
+-----------------------------------+ +-----------------------------------+ +-----------------------------------+
| [LOCK ICON]                       | | [LIGHTNING ICON]                  | | [SHIELD ICON]                     |
| KVM hypervisor boundaries         | | Sub-second cost ceiling           | | Outbound domain whitelist         |
|                                   | |                                   | |                                   |
| Runs code in dedicated microVMs   | | The host proxy meters prompt and  | | Network traffic is restricted to  |
| with Linux cgroups, chroot        | | completion tokens per millisecond.| | approved APIs (such as            |
| jailers, and individual kernels.  | | If spending exceeds your threshold| | api.openai.com). API keys are     |
| A container breakout cannot       | | the microVM is paused immediately.| | injected at the proxy and never   |
| compromise the host.              | |                                   | | written to the guest disk.        |
+-----------------------------------+ +-----------------------------------+ +-----------------------------------+
```

---

### Section 3: Start in Two Commands (Quick Start)
* **Desktop (1440px):** 2-column terminal boxes with monospace strings from [`docs/COPY.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/COPY.md).
* **Mobile (390px):** Stacked terminal snippets with tap-to-copy touch buttons.

```
Desktop (1440px)
+------------------------------------------------------------------------------------------------------------------------+
| Start in two commands                                                                                                  |
| Connect your KVM-enabled Linux server and deploy isolated microVM policies.                                            |
|                                                                                                                        |
| +---------------------------------------------------+  +-------------------------------------------------------------+ |
| | ON YOUR KVM-ENABLED LINUX SERVER:                 |  | IN YOUR PROJECT DIRECTORY:                                  | |
| | $ sandboxctl host init         [host-agent.service|  | $ sandboxctl deploy --policy '{"max_cost_usd": 0.50}'       | |
| +---------------------------------------------------+  +-------------------------------------------------------------+ |
+------------------------------------------------------------------------------------------------------------------------+
```

---

## 3. Core Feature Screens & Every Failure State

### Screen 1: Dashboard Fleet Inventory (`/dashboard`)
* **Grid:** 1440px App Shell (240px nav rail + 12-column workspace). Mobile (390px) single column with touch cards.
* **Eye Path:** 1st: Global Spend/Quota bar -> 2nd: Active Sandbox table rows -> 3rd: "New Sandbox" trigger.

```
Desktop (1440px)
+------------------------------------------------------------------------------------------------------------------------+
| [=] CLOUD SANDBOX           Search: [ microvm-id...     ]   Quota: [$1.42 / $10.00 Cap [||||......]]  [User: Zameer v] |
+------------------+-----------------------------------------------------------------------------------------------------+
| [DASHBOARD   (•)]| SANDBOX FLEET (3 Active / 12 Total)                                            [+ PROVISION SANDBOX]|
| [TEMPLATES      ]| Filter: [All (12)]  [Running (3)]  [Paused (1)]  [Frozen/Killed (8)]                                 |
| [LLM GATEWAY    ]|+---------------------------------------------------------------------------------------------------+ |
| [AUDIT LOGS     ]|| NAME / ID           TEMPLATE     vCPU / RAM   BURN RATE    SPENT / CAP      STATE     ACTIONS      | |
| [SETTINGS       ]||---------------------------------------------------------------------------------------------------| |
|                  || test-agent-refactor ubuntu-22.04 2 / 1024MB   $0.002/sec   $0.42 / $1.00    [RUNNING] [Terminal][X]| |
| [HOST STATUS]    || rogue-agent-test    python-ai    1 / 512MB    $0.000/sec   $0.01 / $0.01 [!] [FROZEN]  [Inspect] [R]| |
| host-01: [ONLINE]|| scraper-daemon      node-agent   1 / 512MB    $0.001/sec   $0.12 / $0.50    [RUNNING] [Terminal][X]| |
| host-02: [ONLINE]|| worker-pr-audit     ubuntu-22.04 4 / 2048MB   $0.000/sec   $0.88 / $2.00    [PAUSED]  [Resume]  [X]| |
|                  |+---------------------------------------------------------------------------------------------------+ |
| [?] Support      | Showing 4 of 12 sandboxes. Redis event stream connected (24ms latency).                             |
+------------------+-----------------------------------------------------------------------------------------------------+
```

---

### Screen 2: Sandbox Creation Modal / Bulkhead Provisioning Flow
* **Purpose:** Hardware limits, spending ceiling, and network whitelist specification before spinning up Firecracker jailer.

```
Desktop (Centered 640px Modal)                 Mobile (Full-screen Sheet)
+-----------------------------------------+    +---------------------------------------+
| [+] PROVISION ISOLATED MICROVM      [X] |    | [< Back] PROVISION ISOLATED MICROVM   |
+-----------------------------------------+    +---------------------------------------+
| Sandbox identifier:                     |    | Sandbox identifier:                   |
| [ agent-task-refactor                 ] |    | [ agent-task-refactor               ] |
| Base rootfs template:                   |    | Base rootfs template:                 |
| [ Ubuntu 22.04 AI Ready               v]|    | [ Ubuntu 22.04 AI Ready             v]|
|                                         |    | Hardware Allocation:                  |
| Hardware Isolation Bounds:              |    | Cores: [ 2 vCPU ]  RAM: [ 1024 MB ]   |
| vCPU Cores:  ( ) 1  (*) 2  ( ) 4        |    |                                       |
| Memory Limit (RAM): (*) 1024 MB ( ) 2GB |    | Hard budget cap (USD):                |
|                                         |    | [ 1.00                              ] |
| Financial Killswitch Policy:            |    | Outbound network whitelist:           |
| Hard budget cap (USD): [ 1.00         ] |    | [*] api.openai.com                    |
| MicroVM freezes automatically when cap  |    | [*] api.anthropic.com                 |
| is reached.                             |    | [*] github.com                        |
|                                         |    |                                       |
| Outbound network whitelist:             |    | [!] Sub-second killswitch active.     |
| [x] api.openai.com  [x] github.com      |    |                                       |
|                                         |    | +-----------------------------------+ |
| +------------------+ +----------------+ |    | | [> LAUNCH MICROVM ]               | |
| | [> LAUNCH VM ]   | | Cancel         | |    | +-----------------------------------+ |
| +------------------+ +----------------+ |    +---------------------------------------+
+-----------------------------------------+
```

---

### Screen 3: Live Sandbox Detail & Telemetry View (`/sandboxes/:id`)
* **Grid:** 1440px Asymmetric 4/8 Split. Left 4 cols: Resource Dials & Thresholds. Right 8 cols: Tabbed Xterm.js & Kernel Log console.
* **Scroll Behaviour:** Header and Telemetry controls sticky; Terminal body has internal scrollback buffer.

```
Desktop (1440px)
+------------------------------------------------------------------------------------------------------------------------+
| [< Back to fleet]  Sandbox: #fc-c840f1-refactor    Active uptime: 00:14:22    State: [● RUNNING] [!] EMERGENCY STOP    |
+-----------------------------------------------+------------------------------------------------------------------------+
| TELEMETRY BULKHEAD (4 Columns)                | LIVE EXECUTION CONSOLE (8 Columns)                                     |
|                                               | Tabs: [* INTERACTIVE SHELL]  [KERNEL DMESG]  [LLM PROXY AUDIT]         |
| RESOURCE UTILISATION:                         +------------------------------------------------------------------------+
| vCPU load (2x AMD EPYC pinned):               | > agent@fc-c840f1:~/workspace$ git status                              |
| [|||||||||||||||...................] 48%     | On branch fix-auth-leak                                                |
| Memory utilization (1024 MB max):             | Changes not staged for commit:                                         |
| [||||||||||||||||||||||............] 72%     |   modified: src/auth/token_verifier.py                                 |
|                                               | > agent@fc-c840f1:~/workspace$ pytest tests/unit/                      |
| FINANCIAL BURN VELOCITY:                      | ================= test session starts ==================               |
| Active burn rate: $0.0034 / sec               | collected 14 items                                                     |
| Cumulative spend: $0.4280 / $1.0000 Cap (42%) | tests/unit/test_verifier.py .......... [100%]                          |
| [||||||||||||||||||................]          |                                                                        |
|                                               | > [LLM_PROXY] 2,420 tokens streamed to api.anthropic.com ($0.0072)    |
| KILLSWITCH RULES CONFIGURED:                  | > agent@fc-c840f1:~/workspace$ _                                       |
| [✓] Hard Spend Ceiling: $1.0000 USD           |                                                                        |
| [✓] Rapid Token Burn Trip: >25k t/min         +------------------------------------------------------------------------+
| [✓] Inactivity Timeout: 30 minutes            | Auto-Scroll: [ON]  |  Font: [JetBrains Mono 13px]  |  [CLEAR]  [DOWNLOAD]  |
|                                               +------------------------------------------------------------------------+
| GUEST VM IDENTIFIERS:                         | HARDWARE EMERGENCY STOP                                                |
| VSock Port:  1024 -> /run/fc-c840f1.vsock     | Killswitch armed: sub-second freeze active.                            |
| Host Jailer: /srv/jailer/firecracker/c840f1   | [/// SAFETY LATCH ARMED ///]  [ TRIP KILLSWITCH NOW ]                  |
+-----------------------------------------------+------------------------------------------------------------------------+
```

---

## 4. Every Failure State (Researched & Designed)

### Failure State 1: Cost Cap Breached (Killswitch Tripped)
* **Trigger:** An autonomous agent enters an infinite tool recursion loop, hitting the budget limit.
* **Visual Treatment:** Screen flashes `--color-signal-breach` (`#EF4444`) 4px hazard rule, terminal freezes immediately with a red stamp overlay, resource dials freeze at last known metric.

```
Desktop (1440px) Containment Breach Banner Overlay
+------------------------------------------------------------------------------------------------------------------------+
| [!] CONTAINMENT BREACH: COST CAP EXCEEDED                                                                              |
| Sandbox #fc-c840f1 spent $0.0104 USD, exceeding your $0.0100 limit. The killswitch halted execution in 640ms.         |
| Process memory is preserved in a frozen state. Zero API keys were exposed to the guest.                                |
+------------------------------------------------------------------------------------------------------------------------+
|  TERMINAL OVERLAY (Execution Halted):                                                                                  |
|  +------------------------------------------------------------------------------------------------------------------+  |
|  | > agent@sandbox:~$ for i in {1..1000}; do curl -X POST $LLM_GATEWAY ...                                          |  |
|  | [KILLSWITCH ENGINE] HALT SIGNAL SENT VIA VSOCK BRIDGE (SIGSTOP -> SIGKILL)                                       |  |
|  | [INCIDENT REPORT] Host protected. Jailer rootfs preserved for inspection.                                         |  |
|  +------------------------------------------------------------------------------------------------------------------+  |
|  Actions: [ DESTROY SANDBOX ]   [ INCREASE CAP TO $0.05 AND RESUME ]   [ DOWNLOAD AUDIT DUMP ]                         |
+------------------------------------------------------------------------------------------------------------------------+
```

### Failure State 2: Zero Active MicroVMs (Empty Fleet State)
* **Trigger:** User has 0 sandboxes running.
* **Visual Treatment:** Subtle matrix grid background (`ref14.png` inspiration), terminal-styled empty state indicator with a single clear launch CTA.

```
+------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                        |
|                                            +------------------------------+                                            |
|                                            |  [ . . . . . . . . . . . ]   |                                            |
|                                            |  [ .   NO ACTIVE MICROVM   . ]|                                            |
|                                            |  [ .    CONTAINMENT DECK   . ]|                                            |
|                                            |  [ . . . . . . . . . . . ]   |                                            |
|                                            +------------------------------+                                            |
|                                              STATUS: 0 JAILED PROCESSES                                                |
|                                                                                                                        |
|                             Your host cluster has zero isolated sandboxes running. Launch a sandbox                    |
|                             from an existing template or execute a test run using the demo agent.                      |
|                                                                                                                        |
|                                         +------------------------------------+                                         |
|                                         |  [+ PROVISION SANDBOX (1GB)]       |                                         |
|                                         +------------------------------------+                                         |
|                                         Or try: [ Launch Rogue Agent Demo ($0.01) ]                                    |
|                                                                                                                        |
+------------------------------------------------------------------------------------------------------------------------+
```

### Failure State 3: Host Agent WebSocket Disconnected
* **Trigger:** Host agent offline, KVM kernel panic, or lost network connection.
* **Visual Treatment:** Amber strip at top of terminal viewport, offline retry indicator, read-only cache mode.

```
+------------------------------------------------------------------------------------------------------------------------+
| [!] WARNING: HOST AGENT CONNECTION LOST                                                                                |
| Lost real-time connection to host agent at 10.0.4.12:8080. Telemetry stream paused. Check that the host-agent service   |
| is running and port 8080 is accessible over mTLS.                                                    [ RECONNECT NOW ] |
+------------------------------------------------------------------------------------------------------------------------+
```

### Failure State 4: Host Cluster Memory Exhausted
* **Trigger:** Physical KVM memory limits on host-01/host-02 are 100% occupied.
* **Visual Treatment:** Modal form input disabled with capacity gauge and quick-cleanup action.

```
+-------------------------------------------------------------------------------+
| [!] HOST CLUSTER OUT OF MEMORY                                            [X] |
+-------------------------------------------------------------------------------+
| All 128 GB of host memory is allocated across 16 running sandboxes.           |
| Cannot provision an additional 1,024 MB microVM.                              |
|                                                                               |
| Options:                                                                      |
| 1. Destroy idle sandboxes: [ Destroy Idle Sandboxes (Reclaims 4GB) ]          |
| 2. Connect secondary node: [ Connect Host Agent in Settings ]                 |
+-------------------------------------------------------------------------------+
```

### Failure State 5: Outbound Network Exfiltration Blocked
* **Trigger:** Agent inside microVM attempts unauthorized outbound connection to non-whitelisted IP/domain.
* **Visual Treatment:** Containment alert card in LLM Gateway tab.

```
+------------------------------------------------------------------------------------------------------------------------+
| [!] OUTBOUND CONNECTION BLOCKED                                                                                        |
| Guest process attempted to connect to unauthorized IP 198.51.100.4:443. The Firecracker jailer firewall dropped       |
| the connection. Outbound traffic is restricted to api.openai.com.                       [ ADD DOMAIN TO WHITELIST ]   |
+------------------------------------------------------------------------------------------------------------------------+
```

### Failure State 6: Memory Cgroup OOM Limit Reached
* **Trigger:** Guest process exceeds allocated RAM limit and is terminated by kernel OOM killer.
* **Visual Treatment:** Red OOM badge in sandbox header with one-click memory upgrade button.

```
+------------------------------------------------------------------------------------------------------------------------+
| [!] PROCESS TERMINATED BY MEMORY LIMIT                                                                                 |
| Process inside microVM #fc-c840f1 exceeded the 512 MB memory boundary and was terminated by the Linux OOM killer.     |
| Resolution: [ INCREASE SANDBOX RAM ALLOCATION TO 1024 MB ]                                                             |
+------------------------------------------------------------------------------------------------------------------------+
```

---

## 5. Admin & Hardware Management Screens (`/settings`)

### Screen 4: Firecracker Host Nodes (`/settings/hosts`)
```
+------------------------------------------------------------------------------------------------------------------------+
| [SETTINGS]  [Profile]  [LLM Credentials]  [CLI Access Keys]  [* FIRECRACKER HOSTS]  [Billing & Caps]                   |
+------------------------------------------------------------------------------------------------------------------------+
| CONNECTED FIRECRACKER HOST NODES                                                                 [+ CONNECT HOST AGENT]|
| Manage bare-metal / nested virtualization Linux hosts running host-agent via mTLS.                                    |
|                                                                                                                        |
| +--------------------------------------------------------------------------------------------------------------------+ |
| | HOST NAME       IP ADDRESS       KERNEL      KVM STATUS    vCPU LOAD       RAM USAGE       SANDBOXES   STATE       | |
| |--------------------------------------------------------------------------------------------------------------------| |
| | host-metal-01   10.0.4.12:8080   5.10.198    [✓ /dev/kvm]  [||||....] 42%  [||||||..] 64%  4 / 16      [HEALTHY]   | |
| | host-metal-02   10.0.4.13:8080   5.10.198    [✓ /dev/kvm]  [|||||||.] 78%  [||||||||] 89%  7 / 16      [WARNING]   | |
| | dev-local-stub  127.0.0.1:8081   Darwin/Arm  [STUB MODE]   [||......] 20%  [|||.....] 30%  1 / 4       [STUB DEV]  | |
| +--------------------------------------------------------------------------------------------------------------------+ |
|                                                                                                                        |
| HOST AGENT SETUP COMMAND (Run on bare-metal Ubuntu 22.04 with /dev/kvm):                                              |
| +--------------------------------------------------------------------------------------------------------------------+ |
| | curl -sSL https://get.cloudsandbox.io/host-agent.sh | sudo bash -s -- --token=cs_host_live_984f1a0e                | |
| +--------------------------------------------------------------------------------------------------------------------+ |
+------------------------------------------------------------------------------------------------------------------------+
```

### Screen 5: Encrypted LLM Credentials (`/settings/llm`)
```
+-------------------------------------------------------------------------------+
| ENCRYPTED LLM API CREDENTIALS                                                 |
| Keys are stored AES-256-GCM encrypted in the control plane and injected via   |
| the host metering gateway. Guest microVM processes never see raw keys.        |
+-------------------------------------------------------------------------------+
| Provider: [ Anthropic (Claude 3.5 Sonnet / Opus)                           v ]|
| API Secret Key: [ sk-ant-api03-••••••••••••••••••••••••••••••••            ] |
| Daily spending limit per sandbox (USD): [ $5.00                            ] |
|                                                                               |
| [✓] Auto-terminate any sandbox that attempts to exfiltrate keys via netcat/env|
|                                                                               |
| +---------------------------------------+                                     |
| | [ SAVE ENCRYPTED KEY ]                |                                     |
| +---------------------------------------+                                     |
+-----------------------------------------------+
```

---

## 6. Global Footer Landmark
```
+------------------------------------------------------------------------------------------------------------------------+
| [=] CLOUD SANDBOX                  Specs: Firecracker v1.7.0 | Linux KVM 5.10      [Fleet] [Demo] [GitHub] [Status: 100%]|
| Hardware-isolated microVM runtime  Zero-trust mTLS host network architecture       Second-year CSE capstone project    |
+------------------------------------------------------------------------------------------------------------------------+
```
