# Project Signoff: Cloud Sandbox

**Document Status:** Ready for Approval  
**Project:** Cloud Sandbox — Second-Year CSE Capstone Project  
**Authoritative References:** [`docs/IDEA.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/IDEA.md), [`docs/TOKENS.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/TOKENS.md), [`docs/HERO.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/HERO.md), [`docs/WIREFRAMES.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/WIREFRAMES.md), [`docs/COPY.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/docs/COPY.md), [`README.md`](file:///Users/zameerabdulkalamnagaral/cloudSandbox/README.md).

---

## 1. Executive Summary
Cloud Sandbox provides secure, bare-metal containment for autonomous AI coding agents using AWS Firecracker v1.7.0 microVMs on Linux KVM. When an untrusted agent enters an infinite loop, attempts prompt injection, or burns tokens excessively, an automated host killswitch halts execution in under 1,000 milliseconds without risking host integrity or leaking API credentials.

---

## 2. Core Pages & Views

1. **Public Landing Page (`/`):** Technical value proposition, Firecracker v1.7.0 benchmark guarantees, live containment chamber preview with ambient video stream, and one-click demo trigger.
2. **Authentication (`/auth/login`, `/auth/register`):** GitHub OAuth SSO and email/password login backed by bcrypt and JWT session tokens.
3. **Fleet Inventory Dashboard (`/dashboard`):** Real-time list of microVM instances, active spend/cap meters, hardware utilization gauges, and lifecycle triggers (`Pause`, `Resume`, `Kill`, `Destroy`).
4. **Sandbox Detail & Execution Console (`/sandboxes/:id`):** Asymmetric split featuring sticky telemetry dials and tabbed Xterm.js console (interactive bash shell, kernel `dmesg`, and LLM gateway token audit log).
5. **Interactive Rogue Agent Demo (`/demo`):** Pre-configured guided demonstration showcasing an AI agent entering an infinite tool loop and tripping a $0.01 cost cap in sub-second latency.
6. **Admin & Settings (`/settings`):** Hardware node cluster management, AES-256-GCM encrypted LLM API credentials, and CLI token generation.

---

## 3. Key Functional Features

* **Hardware-Level Containment:** MicroVM execution via `/dev/kvm`, Linux cgroups, and chroot jailers (`/srv/jailer/firecracker/<id>/root`).
* **Sub-Second Financial Killswitch:** Continuous monitoring of token consumption rates; automatically drops execution via vsock signals (`SIGSTOP`/`SIGKILL`) upon cap breach.
* **Encrypted LLM Proxy Gateway:** Intercepts OpenAI and Anthropic traffic, meters tokens per millisecond, and injects API keys on the host so keys never enter the guest microVM.
* **Low-Latency Streaming:** Bidirectional WebSocket multiplexing over point-to-point hardware VSock (port 1024) for terminal input/output and telemetry fanout.
* **Command Line Interface (`sandboxctl`):** Python-based CLI for spinning up, inspecting, and terminating sandboxes from a developer's local terminal.

---

## 4. Admin & Host Abilities

* Register, monitor health, and view vCPU/RAM allocation across bare-metal Linux host nodes.
* Manage and rotate AES-256-GCM encrypted provider API keys (OpenAI and Anthropic).
* Provision and revoke CLI bearer tokens for remote `sandboxctl` access.
* Export kernel audit logs and incident post-mortems following killswitch triggers.

---

## 5. Explicitly Out of Scope (What Is NOT Included)

* **Payment Gateway Integration:** No Stripe or credit card processing; budgets are enforced strictly as operational software caps.
* **Non-Linux Guest OS Support:** Strictly executes Linux kernel 5.10+ on KVM hardware; no Windows or macOS microVMs.
* **In-Browser IDE / Code Editor:** Focus is the execution runtime, containment boundary, and terminal stream; code authoring is done out-of-band via CLI or local tools.
* **Multi-Region Cluster Federation:** Operates as a single-cluster control plane connecting to one or more host-agent nodes.

---

## 6. Look & Feel and Hero

* **Look and Feel (One Sentence):** An armored industrial containment deck inspired by hardware aerospace consoles, combining obsidian slate surfaces, structural 1px chisel framing, and high-visibility safety amber indicators with zero decorative SaaS fluff.
* **The Hero (One Sentence):** An asymmetric split hero contrasting a bold value proposition with a live "MicroVM Containment Chamber" featuring an ambient 3D code plane loop film, selectable HTML hardware telemetry overlays, and an armed emergency stop killswitch.

---

## 7. Content Still Owed (`[NEEDS FACT]`)

| Missing Item | Owner | Target Date |
|---|---|---|
| Official names and Git branches of the 4 CSE student team members [NEEDS FACT] | Capstone Team Lead | Nov 10, 2026 |
| Final public production deployment domain (replacing `cloudsandbox.io`) [NEEDS FACT] | DevOps / Host Lead | Nov 12, 2026 |
| Official notification mailbox address (replacing `alerts@cloudsandbox.io`) [NEEDS FACT] | Team Lead | Nov 12, 2026 |

---

## 8. Milestone Deadlines & Review Rhythm

* **Review Rhythm:** Bi-weekly faculty mentor status check-ins; weekly sprint reviews across all four student team members.
* **Internal Code Freeze & Load Benchmark:** November 15, 2026.
* **Final Capstone Defense & Live Faculty Demonstration:** November 25, 2026.

---

## 9. Change Protocol

Anything changed after approval goes through `/change`.

---

### Approval

**Approved by:** _______________________________________  
**Date:** ________________________
