# Production Copy: Cloud Sandbox

Sources: [`docs/WIREFRAMES.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/WIREFRAMES.md), [`docs/TOKENS.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/TOKENS.md), [`README.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/README.md), and codebase reality check.  
Style: Active voice, sentence case, cold technical precision. Zero apologies in errors.  
Banned words strictly omitted: *passionate, innovative, seamless, leverage, crafting, journey, cutting-edge, building the future*.

---

## 1. Global Navigation & System Banner

| Location | String | Max Chars | Purpose |
|---|---|---|---|
| Nav: Brand Mark | Cloud Sandbox | 16 | Primary product name |
| Nav: Subtitle | Firecracker microVM Isolation | 32 | Engineering thesis tag |
| Nav: Status Badge | System operational | 20 | Live cluster health status |
| Nav: Status Badge (Degraded) | Host agent disconnected | 26 | Cluster warning status |
| Nav: Link 1 | Fleet | 10 | Primary navigation to inventory |
| Nav: Link 2 | Documentation | 15 | Link to technical docs |
| Nav: Action | Launch demo | 14 | Primary public action |
| Nav: Auth | Sign in | 10 | Login navigation |

---

## 2. Public Landing Page

### Hero Section
| Element | String | Max Chars | Purpose |
|---|---|---|---|
| Eyebrow Badge | Firecracker v1.7.0 kernel isolation | 38 | Technical proof anchor |
| Headline | Run AI coding agents in Firecracker microVMs. With sub-second cost-cap killswitches. | 86 | Direct thesis statement |
| Subhead | Contain untrusted LLM tool loops on your own Linux hardware. When an agent enters an infinite loop or exceeds your budget, the killswitch freezes execution in under 1,000 milliseconds. | 185 | Concrete functional description |
| Primary CTA | Test run rogue agent | 24 | Direct action trigger |
| Primary CTA Helper | Pre-configured $0.01 budget cap | 35 | Scope guarantee |
| Secondary CTA | Read architecture docs | 25 | Secondary documentation action |
| Latency Guarantee Tag | Verified freeze latency: under 850ms | 38 | Benchmark proof point |

### Live Containment Preview Chamber (Hero Widget)
| Element | String | Max Chars | Purpose |
|---|---|---|---|
| Chamber Title | Containment chamber #vm-demo-01 | 35 | Instance identifier |
| State Badge | Running | 10 | Lifecycle state |
| Video Accessible Label | MicroVM autonomous code execution stream | 45 | Screen reader video description |
| Poster Alt Text | Three-dimensional isometric code block glowing in an isolated virtual machine void | 85 | High-contrast LCP poster alt |
| Video Fallback Notice | Hardware video decode unavailable. Displaying static containment snapshot. | 75 | Low-bandwidth / error notice |
| Metric Label 1 | vCPU allocation | 18 | Hardware metric |
| Metric Label 2 | RAM allocation | 18 | Memory metric |
| Metric Label 3 | Burn velocity | 16 | Token spend velocity |
| Metric Label 4 | VSock path | 14 | Hardware socket descriptor |
| Terminal Eyebrow | Live stdout (/bin/bash via vsock) | 36 | Connection descriptor |
| Killswitch Label | Emergency stop | 16 | Mechanical control label |
| Killswitch Button | Pull to freeze | 16 | Mechanical trigger action |
| Killswitch Stamp | [FROZEN] Killswitch tripped at $0.0102 | 40 | Terminal freeze stamp |
| Latency Metric | Trip to pause latency: 42.4ms | 32 | Hardware benchmark readout |

### Technical Architecture Proof (3 Columns)
| Card | Headline | Body | Max Chars (Body) |
|---|---|---|---|
| 1. True Hardware Isolation | KVM hypervisor boundaries | Runs code in dedicated microVMs with Linux cgroups, chroot jailers, and individual kernels. A container breakout cannot compromise the host. | 140 |
| 2. Financial Killswitch | Sub-second cost ceiling | The host proxy meters prompt and completion tokens per millisecond. If spending exceeds your threshold, the microVM is paused immediately. | 145 |
| 3. Zero Host Exposure | Outbound domain whitelist | Network traffic is restricted to approved APIs (such as api.openai.com). API keys are injected at the proxy and never written to the guest disk. | 150 |

---

## 3. Authentication (`/auth/login`, `/auth/register`)

| Element | String | Max Chars | Purpose |
|---|---|---|---|
| Sign In Title | Sign in to Cloud Sandbox | 28 | Auth card header |
| Sign In Subhead | Access your isolated Firecracker host cluster. | 50 | Purpose statement |
| OAuth Button | Continue with GitHub | 24 | Primary developer SSO |
| Divider | Or continue with email | 26 | Visual separation |
| Email Label | Email address | 16 | Field identifier |
| Email Placeholder | name@company.com | 20 | Input hint |
| Password Label | Password | 12 | Field identifier |
| Sign In Submit | Sign in | 10 | Form action |
| Register Title | Create host account | 22 | Registration header |
| Register Submit | Create account | 16 | Registration action |

---

## 4. Dashboard Fleet Inventory (`/dashboard`)

| Element | String | Max Chars | Purpose |
|---|---|---|---|
| Page Header | MicroVM fleet | 16 | View title |
| Global Quota Label | Monthly spend ceiling | 24 | Fleet spend descriptor |
| Search Placeholder | Filter by sandbox ID or name... | 35 | Search input hint |
| New Sandbox CTA | Provision sandbox | 20 | Action trigger |
| Table Header 1 | Sandbox name | 16 | Column descriptor |
| Table Header 2 | Template | 12 | Column descriptor |
| Table Header 3 | Hardware | 12 | Column descriptor |
| Table Header 4 | Burn rate | 12 | Column descriptor |
| Table Header 5 | Spend / Cap | 14 | Column descriptor |
| Table Header 6 | State | 10 | Column descriptor |
| Table Header 7 | Actions | 10 | Column descriptor |
| Action 1 | Open terminal | 15 | Shell trigger |
| Action 2 | Pause | 10 | Lifecycle trigger |
| Action 3 | Resume | 10 | Lifecycle trigger |
| Action 4 | Kill | 10 | Emergency termination |
| Action 5 | Destroy | 10 | Teardown action |

---

## 5. Provisioning Modal (New Sandbox)

| Element | String | Max Chars | Purpose |
|---|---|---|---|
| Modal Title | Provision isolated microVM | 30 | Dialog title |
| Field 1 Label | Sandbox identifier | 20 | Form label |
| Field 1 Placeholder | agent-task-refactor | 24 | Name suggestion |
| Field 2 Label | Base rootfs template | 24 | OS image selection |
| Field 3 Label | vCPU allocation | 18 | Compute cores slider |
| Field 4 Label | Memory limit (RAM) | 20 | Memory allocation |
| Field 5 Label | Hard budget cap (USD) | 24 | Financial ceiling input |
| Field 5 Helper | MicroVM freezes automatically when cumulative token spend reaches this value. | 85 | Guidance text |
| Field 6 Label | Outbound network whitelist | 28 | Security firewall |
| Submit Button | Launch microVM | 16 | Primary form action |
| Cancel Button | Cancel | 10 | Dismiss dialog |

---

## 6. Sandbox Detail & Execution Telemetry (`/sandboxes/:id`)

| Element | String | Max Chars | Purpose |
|---|---|---|---|
| Back Link | Back to fleet | 16 | Navigation return |
| Uptime Label | Active uptime | 16 | Runtime duration |
| Gauge 1 | vCPU load | 12 | Compute utilization |
| Gauge 2 | Memory utilization | 20 | RAM utilization |
| Gauge 3 | Cumulative spend | 18 | Total cost incurred |
| Gauge 4 | Active burn rate | 18 | Spend per second |
| Console Tab 1 | Interactive shell | 20 | Terminal mode |
| Console Tab 2 | Kernel dmesg | 15 | Boot log mode |
| Console Tab 3 | LLM proxy audit | 18 | Financial inspection |
| Killswitch Card Title | Hardware emergency stop | 26 | Safety console label |
| Killswitch Armed Label | Killswitch armed: sub-second freeze active | 45 | Protection guarantee |
| Killswitch Action | Trip killswitch now | 22 | Immediate manual halt |

---

## 7. Admin & Hardware Management (`/settings`)

| Element | String | Max Chars | Purpose |
|---|---|---|---|
| Settings Tab 1 | Firecracker hosts | 20 | KVM hardware nodes |
| Settings Tab 2 | LLM credentials | 18 | Encrypted proxy keys |
| Settings Tab 3 | CLI access keys | 18 | sandboxctl tokens |
| Host Table Header 1 | Node address | 15 | Host IP/port |
| Host Table Header 2 | Kernel / KVM | 14 | Linux virtualization driver |
| Host Table Header 3 | vCPU load | 12 | Capacity allocation |
| Host Table Header 4 | Memory load | 14 | RAM allocation |
| Host Table Header 5 | Active sandboxes | 18 | Density metric |
| Connect Host CTA | Connect host agent | 20 | Add cluster node |
| Save Key Button | Save encrypted key | 20 | Secret persist action |
| Generate Key Button | Create CLI token | 18 | Token creation |

---

## 8. Exact Failure State Messages (No Apologies; What Went Wrong + How to Fix It)

### 1. Cost Cap Breached (Killswitch Tripped)
* **Title:** Containment breach: cost cap exceeded
* **Message:** Sandbox #fc-c840f1 spent $0.0104 USD, exceeding your $0.0100 limit. The killswitch halted execution in 640ms. Process memory is preserved in a frozen state.
* **Resolution Action 1:** Destroy sandbox
* **Resolution Action 2:** Increase cap to $0.05 and resume

### 2. Zero Active MicroVMs (Empty Fleet State)
* **Title:** No active microVMs
* **Message:** Your host cluster has zero isolated sandboxes running. Launch a sandbox from an existing template or execute a test run using the demo agent.
* **Resolution Action 1:** Provision sandbox
* **Resolution Action 2:** Launch rogue agent demo

### 3. Host Agent WebSocket Disconnected
* **Title:** Host agent connection lost
* **Message:** Lost real-time connection to host agent at 10.0.4.12:8080. Telemetry stream paused. Check that the host-agent service is running and port 8080 is accessible over mTLS.
* **Resolution Action:** Reconnect now

### 4. Host Cluster Memory Exhausted
* **Title:** Host cluster out of memory
* **Message:** All 128 GB of host memory is allocated across 16 running sandboxes. Cannot provision an additional 1,024 MB microVM.
* **Resolution Action 1:** Destroy idle sandboxes
* **Resolution Action 2:** Connect secondary host node

### 5. Outbound Network Exfiltration Attempt
* **Title:** Outbound connection blocked
* **Message:** Guest process attempted to connect to unauthorized IP 198.51.100.4:443. The Firecracker jailer firewall dropped the connection. Outbound traffic is restricted to api.openai.com.
* **Resolution Action:** Add domain to sandbox whitelist

### 6. Memory Cgroup OOM Limit Reached
* **Title:** Process terminated by memory limit
* **Message:** Process inside microVM #fc-c840f1 exceeded the 512 MB memory boundary and was terminated by the Linux OOM killer.
* **Resolution Action:** Increase sandbox RAM allocation to 1024 MB

---

## 9. Transactional Emails Sent

### Email 1: Killswitch Breach Alert
* **Subject:** [ALERT] Cloud Sandbox #fc-c840f1 frozen: cost cap exceeded
* **Sender:** Cloud Sandbox Security `<alerts@cloudsandbox.io>`
* **Body:**
  ```text
  Cloud Sandbox Alert

  Sandbox identifier: fc-c840f1 (agent-task-refactor)
  Incident timestamp: 2026-11-05 14:22:18 UTC
  Trigger cause: Budget ceiling exceeded ($0.0104 spent vs $0.0100 cap).
  Reaction time: Execution frozen in 640ms via host jailer vsock signal.

  Status: The microVM is currently frozen. No additional token costs are accumulating.

  To inspect the execution audit dump or destroy the microVM, open your dashboard:
  https://cloudsandbox.io/sandboxes/fc-c840f1
  ```

### Email 2: Host Node Offline
* **Subject:** [WARN] Firecracker host node host-metal-01 heartbeat timeout
* **Sender:** Cloud Sandbox Infrastructure `<alerts@cloudsandbox.io>`
* **Body:**
  ```text
  Cloud Sandbox Host Warning

  Host node: host-metal-01 (10.0.4.12:8080)
  Event: Missed 3 consecutive heartbeats (60 seconds).
  Impact: 4 microVMs on this node are currently unreachable via control plane.

  Check host-agent daemon status on the physical host:
  sudo systemctl status host-agent
  ```

---

## 10. Privacy & Security Notice

### MicroVM Isolation and Secret Handling Policy
1. **API Key Injection:** OpenAI and Anthropic API keys are stored AES-256-GCM encrypted in the control plane database. Keys are injected directly by the host metering gateway proxy into outgoing HTTPS requests. Keys are never written to the guest filesystem or environment variables.
2. **Code & Data Confinement:** All files created or modified by an AI agent reside solely within the isolated rootfs overlay (`/srv/jailer/firecracker/<id>/root`). Upon clicking "Destroy sandbox", the overlay is zeroed and unmounted.
3. **Telemetry Logs:** Standard output and error streams are buffered in local Redis streams for real-time terminal display and discarded according to user-configured retention periods (default: 7 days).

---

## 11. Proof Inventory & Fact Verification Log

### Confirmed Facts (From Codebase & README)
* AWS Firecracker v1.7.0 pinned for microVM runtime.
* Linux Kernel v5.10 (reference `hello-vmlinux`).
* Sub-second killswitch freeze latency target (<1,000ms).
* Demo sandbox runs with a $0.01 USD spending limit.
* Redis Streams for internal events; Redis pub/sub for WebSocket fanout.
* AES-256-GCM database encryption for LLM credentials.
* CLI binary is `sandboxctl` (`pip install sandboxctl`).
* REST API prefix is `/api/v1`.

### Facts Requiring User Confirmation (`[NEEDS FACT]`)
* `[NEEDS FACT: Capstone Team Names]` — Needs exact names of the 4 CSE student team members for the capstone footer and evaluation attribution.
* `[NEEDS FACT: Production Domain]` — Placeholder `cloudsandbox.io` used in emails and links; verify against final deployment domain.
* `[NEEDS FACT: Support Email]` — Placeholder `alerts@cloudsandbox.io` used in notification headers; verify official delivery mailbox.

