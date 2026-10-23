# Cloud Sandbox

> Run AI coding agents in isolated Firecracker microVMs on your own cloud — with automatic cost-cap killswitches that freeze runaway agents in under a second.

## Assumptions

1. **Firecracker host**: A bare-metal or nested-virt Linux server with `/dev/kvm` available and kernel ≥5.10 is required for actual microVM execution. The control plane and dashboard run anywhere Docker Compose runs; the host agent runs only on the KVM-enabled machine.
2. **Nested virtualisation in CI**: Integration tests that require real Firecracker run only when `FIRECRACKER_ENABLED=1` is set. Otherwise the lifecycle tests run against a stub host agent.
3. **AWS Firecracker v1.7.0** is pinned for stability. The kernel image is the Firecracker hello-vmlinux v5.10 reference kernel.
4. **GitHub OAuth** is the primary SSO provider; email/password sign-up is also supported via bcrypt + JWT.
5. **LLM metering gateway** proxies to `api.openai.com` and `api.anthropic.com`; the user's API key is stored AES-256-GCM encrypted in Postgres and injected per-request; it never enters the VM.
6. **mTLS** is used between the control plane and host agents in production. A shared bearer token is the fallback for single-host dev setups.
7. **Redis Streams** drive internal event propagation; Redis pub/sub is used for real-time WebSocket fan-out.
8. **Caddy** provides automatic TLS (Let's Encrypt) in production. HTTP is used in dev (`localhost`).
9. **Demo mode** deploys a bundled `rogue_agent.py` into a dedicated demo microVM with a $0.01 cost cap. A demo VM resets automatically after destroy.
10. **`sandboxctl` CLI** is pip-installable (`pip install sandboxctl`) and ships separately from the control plane.
