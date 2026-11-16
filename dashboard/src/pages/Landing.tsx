import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Terminal, Shield, Zap, Lock, Cpu, Layers, CheckCircle2, XCircle, Copy, Check } from 'lucide-react'
import { HeroChamber } from '../components/hero/HeroChamber'
import { InteractiveSimulator } from '../components/demo/InteractiveSimulator'
import { useAuthStore } from '../store/auth'

export function Landing() {
  const navigate = useNavigate()
  const { user, loginAsDemo } = useAuthStore()
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)

  const handleOpenFleet = () => {
    if (!user) loginAsDemo()
    navigate('/dashboard')
  }

  const copyCommand = (id: string, cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedCmd(id)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  return (
    <div className="min-h-screen bg-bg-base text-ink-primary font-sans">
      {/* Global Header & Navigation Landmark */}
      <header role="banner" className="border-b border-rule-frame bg-surface-bulkhead sticky top-0 z-40">
        <nav aria-label="Main Navigation" className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 text-ink-primary focus:outline-none focus:ring-2 focus:ring-white/40 rounded-sm">
              <div className="w-8 h-8 rounded-sm bg-surface-elevated border border-rule-frame flex items-center justify-center">
                <Terminal className="w-4 h-4 text-ink-primary" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-base tracking-tight leading-none text-ink-primary">
                  Cloud Sandbox
                </span>
                <span className="font-mono text-xs text-ink-muted uppercase tracking-wider">
                  Firecracker microVM Isolation
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-rule-frame">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                System operational
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#architecture-proof"
              className="hidden sm:inline-flex text-sm font-medium text-ink-muted hover:text-ink-primary px-2 py-1"
            >
              How It Works
            </a>
            <Link to="/auth/login" className="btn-secondary text-sm px-3.5 py-2">
              Sign in
            </Link>
            <button
              type="button"
              onClick={handleOpenFleet}
              className="btn-primary text-sm px-4 py-2"
            >
              Open Fleet Console
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section: Full-Bleed Ambient Background (Alternative B) */}
      <HeroChamber />

      {/* Main Content Landmark */}
      <main id="main-content" className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-16 sm:space-y-24">
        
        {/* Interactive Rogue Agent Simulator (Expanded Terminal Console) */}
        <InteractiveSimulator />

        {/* Section 2: Technical Architecture Proof (Asymmetric High-Density Breakdown) */}
        <section id="architecture-proof" aria-labelledby="architecture-heading" className="space-y-8">
          <div className="border-b border-rule-frame pb-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-sm text-2xs font-mono uppercase tracking-wider bg-surface-elevated border border-rule-frame text-ink-muted mb-2">
                <Layers className="w-3 h-3 text-ink-primary" aria-hidden="true" />
                <span>Defense-in-Depth Specification</span>
              </div>
              <h2 id="architecture-heading" className="font-display font-semibold text-2xl text-ink-primary">
                Technical Architecture & Kernel Isolation
              </h2>
            </div>
            <p className="text-xs font-mono text-ink-muted">
              SPEC: FIRECRACKER-V1.7 · LINUX KVM 5.10
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left 7 Columns: KVM Hypervisor & MicroVM Isolation Stack (Primary Deep-Dive) */}
            <article className="lg:col-span-7 card p-6 sm:p-7 bg-surface-bulkhead border border-rule-frame rounded-md shadow-bulkhead flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 font-mono text-2xs text-ink-muted uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                    <span>Hardware Root of Trust · Hardware KVM</span>
                  </div>
                  <span className="font-mono text-2xs text-ink-muted border border-rule-frame px-2 py-0.5 rounded-sm bg-bg-base">
                    Ring -1 /dev/kvm
                  </span>
                </div>

                <h3 className="font-display font-semibold text-xl text-ink-primary">
                  Hardware-Enforced MicroVM Containment Stack
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Unlike Docker containers that share the host kernel, every untrusted AI agent process executes in its own dedicated Firecracker microVM with an independent Linux 5.10 kernel, memory space, and chroot jailer.
                </p>
              </div>

              {/* Stack Diagram: 4 High-Density Containment Layers */}
              <div className="space-y-2.5 font-mono text-xs">
                {/* Layer 4: Guest Agent */}
                <div className="p-3 bg-bg-base border border-rule-frame rounded-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span className="px-1.5 py-0.5 text-2xs font-bold rounded bg-surface-elevated border border-rule-frame text-ink-muted shrink-0 mt-0.5 sm:mt-0">
                      L4
                    </span>
                    <div>
                      <span className="text-ink-primary font-semibold block sm:inline">Untrusted Agent Runtime</span>
                      <span className="text-ink-muted text-2xs block sm:inline sm:ml-2">Python 3.11 / Node.js loop · unprivileged uid 1000 · zero sudo</span>
                    </div>
                  </div>
                  <span className="self-start sm:self-center px-2 py-0.5 text-2xs font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    ISOLATED
                  </span>
                </div>

                {/* Layer 3: Dedicated Linux Kernel */}
                <div className="p-3 bg-bg-base border border-rule-frame rounded-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span className="px-1.5 py-0.5 text-2xs font-bold rounded bg-surface-elevated border border-rule-frame text-ink-muted shrink-0 mt-0.5 sm:mt-0">
                      L3
                    </span>
                    <div>
                      <span className="text-ink-primary font-semibold block sm:inline">Dedicated Guest Kernel</span>
                      <span className="text-ink-muted text-2xs block sm:inline sm:ml-2">Custom Linux 5.10 · cgroups v2 (512MB RAM ceiling, 2 vCPUs)</span>
                    </div>
                  </div>
                  <span className="self-start sm:self-center px-2 py-0.5 text-2xs font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    CGROUPS V2
                  </span>
                </div>

                {/* Layer 2: Chroot Jailer & Seccomp */}
                <div className="p-3 bg-bg-base border border-rule-frame rounded-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span className="px-1.5 py-0.5 text-2xs font-bold rounded bg-surface-elevated border border-rule-frame text-ink-muted shrink-0 mt-0.5 sm:mt-0">
                      L2
                    </span>
                    <div>
                      <span className="text-ink-primary font-semibold block sm:inline">Jailer & Seccomp-BPF</span>
                      <span className="text-ink-muted text-2xs block sm:inline sm:ml-2">chroot jail · pivot_root · drops 270+ kernel syscalls</span>
                    </div>
                  </div>
                  <span className="self-start sm:self-center px-2 py-0.5 text-2xs font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    SECCOMP-BPF
                  </span>
                </div>

                {/* Layer 1: Bare-Metal Host Hypervisor */}
                <div className="p-3 bg-surface-elevated border border-rule-frame rounded-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span className="px-1.5 py-0.5 text-2xs font-bold rounded bg-bg-base border border-rule-frame text-ink-muted shrink-0 mt-0.5 sm:mt-0">
                      L1
                    </span>
                    <div>
                      <span className="text-ink-primary font-semibold block sm:inline">Host KVM Hypervisor</span>
                      <span className="text-ink-muted text-2xs block sm:inline sm:ml-2">Hardware virtualization (Intel VT-x / AMD-V) · vsock:cid 3:1024</span>
                    </div>
                  </div>
                  <span className="self-start sm:self-center px-2 py-0.5 text-2xs font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    HOST PROTECTED
                  </span>
                </div>
              </div>

              {/* Bottom hardware benchmarks */}
              <div className="pt-4 border-t border-rule-frame grid grid-cols-3 gap-2 font-mono text-center">
                <div className="p-2 rounded bg-bg-base border border-rule-frame/60">
                  <span className="text-2xs text-ink-muted uppercase block">Boot Latency</span>
                  <span className="text-xs sm:text-sm font-semibold text-ink-primary">&lt; 125ms</span>
                </div>
                <div className="p-2 rounded bg-bg-base border border-rule-frame/60">
                  <span className="text-2xs text-ink-muted uppercase block">Memory Base</span>
                  <span className="text-xs sm:text-sm font-semibold text-ink-primary">&lt; 5MB / VM</span>
                </div>
                <div className="p-2 rounded bg-bg-base border border-rule-frame/60">
                  <span className="text-2xs text-ink-muted uppercase block">Escape Risk</span>
                  <span className="text-xs sm:text-sm font-semibold text-emerald-400">0 (Zero Shared Kernel)</span>
                </div>
              </div>
            </article>

            {/* Right 5 Columns: Stacked Telemetry & Enforcement Cards */}
            <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
              
              {/* Secondary Card 1: Sub-Second Financial Killswitch */}
              <article className="card p-5 sm:p-6 bg-surface-bulkhead border border-rule-frame rounded-md shadow-bulkhead flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs text-ink-primary uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Financial Safeguard</span>
                    </div>
                    <span className="font-mono text-2xs text-ink-muted border border-rule-frame px-1.5 py-0.5 rounded-sm bg-bg-base">
                      sub-second
                    </span>
                  </div>

                  <h3 className="font-display font-semibold text-lg text-ink-primary">
                    Real-Time Token Burn Ceiling
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    The host proxy meters streaming API tokens in memory. If an autonomous agent enters a recursive loop or exceeds the policy cap, the Firecracker pause API freezes execution instantly.
                  </p>
                </div>

                <div className="p-3 bg-bg-base border border-rule-frame rounded-sm font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-2xs border-b border-rule-frame/60 pb-1.5">
                    <span className="text-ink-muted">THROTTLING PIPELINE</span>
                    <span className="text-emerald-400">ACTIVE METERING</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Trip to Freeze Latency:</span>
                    <span className="text-ink-primary font-semibold">&lt; 50ms verified</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Interception Method:</span>
                    <span className="text-ink-primary font-semibold">SIGSTOP / cgroup freeze</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-muted">Token Meter Rate:</span>
                    <span className="text-ink-primary font-semibold">Redis Streams line-rate</span>
                  </div>
                </div>
              </article>

              {/* Secondary Card 2: Egress Whitelist & Injected Key Proxy */}
              <article className="card p-5 sm:p-6 bg-surface-bulkhead border border-rule-frame rounded-md shadow-bulkhead flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs text-emerald-400 uppercase tracking-wider">
                      <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Zero Host Exposure</span>
                    </div>
                    <span className="font-mono text-2xs text-ink-muted border border-rule-frame px-1.5 py-0.5 rounded-sm bg-bg-base">
                      mTLS Egress
                    </span>
                  </div>

                  <h3 className="font-display font-semibold text-lg text-ink-primary">
                    Outbound Domain Whitelist & Key Vault
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    API keys never touch the microVM disk or filesystem. The host reverse proxy injects AES-256 encrypted credentials in flight while blocking non-whitelisted destinations.
                  </p>
                </div>

                <div className="p-2.5 bg-bg-base border border-rule-frame rounded-sm font-mono text-2xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2 py-1 border-b border-rule-frame/40">
                    <span className="text-ink-primary flex items-center gap-1.5 min-w-0 truncate">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">api.openai.com:443</span>
                    </span>
                    <span className="text-emerald-400 font-semibold shrink-0 text-right">ALLOWED · INJECTED</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1 border-b border-rule-frame/40">
                    <span className="text-ink-primary flex items-center gap-1.5 min-w-0 truncate">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">api.anthropic.com:443</span>
                    </span>
                    <span className="text-emerald-400 font-semibold shrink-0 text-right">ALLOWED · INJECTED</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-ink-muted flex items-center gap-1.5 min-w-0 truncate">
                      <XCircle className="w-3 h-3 text-ink-muted shrink-0" aria-hidden="true" />
                      <span className="truncate">* (RFC 1918 / Arbitrary)</span>
                    </span>
                    <span className="text-ink-muted font-semibold shrink-0 text-right">DROPPED (RST)</span>
                  </div>
                </div>
              </article>

            </div>

          </div>
        </section>

        {/* Section 3: Quick Start Guide (Synced with ./sandboxctl CLI) */}
        <section id="quickstart" aria-labelledby="quickstart-heading" className="card p-6 sm:p-8 bg-surface-bulkhead border border-rule-frame rounded-md space-y-6 shadow-bulkhead">
          <div className="border-b border-rule-frame pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 id="quickstart-heading" className="font-display font-semibold text-2xl text-ink-primary">
                Manage Sandboxes from the Command Line
              </h2>
              <p className="text-sm text-ink-muted mt-1">
                Everything you run with <code className="text-ink-primary font-mono">./sandboxctl</code> updates live on the web dashboard in real time.
              </p>
            </div>
            <button type="button" onClick={handleOpenFleet} className="btn-secondary text-sm shrink-0">
              Open Web Fleet Dashboard
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono text-xs">
            {/* Box 1: Check Status & Hosts */}
            <div className="border border-rule-frame rounded-sm bg-bg-base overflow-hidden">
              <div className="bg-surface-elevated px-4 py-2.5 border-b border-rule-frame flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold text-ink-primary">1. CHECK CONTROL PLANE &amp; HOSTS</span>
                <span>sandboxctl status</span>
              </div>
              <div className="p-4 space-y-3">
                <span className="text-ink-muted block text-xs uppercase font-sans">Run inside your Cloud Sandbox folder:</span>
                <div className="p-3 bg-surface-bulkhead rounded-sm border border-rule-frame text-ink-primary flex items-center justify-between gap-2">
                  <code className="text-sm font-bold text-ink-primary overflow-x-auto">./sandboxctl status &amp;&amp; ./sandboxctl list</code>
                  <button
                    type="button"
                    onClick={() => copyCommand('status', './sandboxctl status && ./sandboxctl list')}
                    className="btn-secondary px-2.5 py-1.5 min-h-[32px] text-xs shrink-0"
                    title="Copy command"
                  >
                    {copiedCmd === 'status' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-ink-muted font-sans">
                  Shows whether the backend API on port 8000 is healthy, active KVM nodes, and running microVMs.
                </p>
              </div>
            </div>

            {/* Box 2: Deploy & Trigger Live Killswitch */}
            <div className="border border-rule-frame rounded-sm bg-bg-base overflow-hidden">
              <div className="bg-surface-elevated px-4 py-2.5 border-b border-rule-frame flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold text-ink-primary">2. DEPLOY MICROVM &amp; TEST KILLSWITCH</span>
                <span>sandboxctl deploy</span>
              </div>
              <div className="p-4 space-y-3">
                <span className="text-ink-muted block text-xs uppercase font-sans">Create a sandbox with a strict $0.01 limit:</span>
                <div className="p-3 bg-surface-bulkhead rounded-sm border border-rule-frame text-ink-primary flex items-center justify-between gap-2">
                  <code className="text-xs sm:text-sm font-bold text-ink-primary overflow-x-auto">./sandboxctl deploy --name cli-test --policy '{`{"max_cost_usd": 0.01}`}' --scenario loop</code>
                  <button
                    type="button"
                    onClick={() => copyCommand('deploy', `./sandboxctl deploy --name cli-test --policy '{"max_cost_usd": 0.01}' --scenario loop`)}
                    className="btn-secondary px-2.5 py-1.5 min-h-[32px] text-xs shrink-0"
                    title="Copy command"
                  >
                    {copiedCmd === 'deploy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-ink-muted font-sans">
                  Boots a live microVM on the backend, streams tokens in your terminal, and freezes it automatically when $0.01 is spent.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Global Footer Landmark */}
      <footer role="contentinfo" className="border-t border-rule-frame bg-surface-bulkhead/50 mt-16 sm:mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-ink-muted">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span className="font-semibold text-ink-primary">Cloud Sandbox</span>
            <span className="hidden sm:inline text-rule-frame">·</span>
            <span>Hardware-isolated microVM runtime</span>
            <span className="hidden sm:inline text-rule-frame">·</span>
            <span>Firecracker v1.7.0 | Linux KVM 5.10</span>
          </div>

          <div className="flex items-center gap-4">
            <a href="#demo" className="hover:text-ink-primary">
              Demo
            </a>
            <Link to="/style-tile" className="hover:text-ink-primary">
              Style Tile
            </Link>
            <a
              href="https://github.com/your-org/cloud-sandbox"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink-primary"
            >
              GitHub
            </a>
            <span className="text-emerald-400">System status: 100%</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
