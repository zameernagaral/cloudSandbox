import React from 'react'
import { Link } from 'react-router-dom'
import { Terminal, Shield, Zap, Lock, Activity, ArrowRight } from 'lucide-react'

export function Landing() {
  return (
    <div className="min-h-screen bg-bg-base text-ink-primary font-sans">
      {/* Global Header & Navigation Landmark */}
      <header role="banner" className="border-b border-rule-frame bg-surface-bulkhead sticky top-0 z-30">
        <nav aria-label="Main Navigation" className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 text-ink-primary focus:outline-none focus:ring-2 focus:ring-signal-hazard rounded-sm">
              <div className="w-8 h-8 rounded-sm bg-signal-hazard/15 border border-signal-hazard/30 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-signal-hazard" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-base tracking-tight leading-none text-ink-primary">
                  Cloud Sandbox
                </span>
                <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider">
                  Firecracker microVM Isolation
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-rule-frame">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                System operational
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex text-xs font-mono text-ink-muted hover:text-ink-primary px-2 py-1"
            >
              Fleet
            </Link>
            <a
              href="https://github.com/your-org/cloud-sandbox#readme"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex text-xs font-mono text-ink-muted hover:text-ink-primary px-2 py-1"
            >
              Documentation
            </a>
            <Link to="/auth/login" className="btn-secondary text-xs px-3 py-1.5">
              Sign in
            </Link>
            <Link to="/demo" className="btn-primary text-xs px-3 py-1.5">
              Launch demo
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content Landmark */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 space-y-16 sm:space-y-24">
        
        {/* Section 1: Hero & Value Proposition */}
        <section id="hero" aria-labelledby="hero-heading" className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column (5 Cols) - Statements & CTAs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-signal-hazard/10 border border-signal-hazard/30 text-signal-hazard text-xs font-mono uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Firecracker v1.7.0 kernel isolation</span>
            </div>

            <h1 id="hero-heading" className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-ink-primary leading-[1.12]">
              Run AI coding agents in Firecracker microVMs. With sub-second cost-cap killswitches.
            </h1>

            <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
              Contain untrusted LLM tool loops on your own Linux hardware. When an agent enters an infinite loop or exceeds your budget, the killswitch freezes execution in under 1,000 milliseconds.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/demo"
                  className="btn-primary px-5 py-3 text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" aria-hidden="true" />
                  <span>Test run rogue agent</span>
                  <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </Link>
                <a
                  href="#architecture-proof"
                  className="btn-secondary px-4 py-3 text-sm font-medium"
                >
                  Read architecture docs
                </a>
              </div>
              <p className="text-xs font-mono text-ink-muted">
                Pre-configured $0.01 budget cap · <span className="text-emerald-400">Verified freeze latency: under 850ms</span>
              </p>
            </div>
          </div>

          {/* Right Column (7 Cols) - Labelled Hero Placeholder Box at Exact Size */}
          <div className="lg:col-span-7">
            <div
              id="hero-interactive-chamber"
              aria-label="Interactive Hero Placeholder"
              className="w-full min-h-[420px] bg-surface-bulkhead border border-rule-frame rounded-md p-6 flex flex-col justify-between shadow-bulkhead"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-rule-frame pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-signal-hazard" aria-hidden="true" />
                  <span className="font-mono text-xs font-semibold text-ink-primary">
                    [HERO PLACEHOLDER: Live MicroVM Containment Chamber]
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-signal-hazard/15 text-signal-hazard border border-signal-hazard/30">
                  Target Size: 7-Col Deck (420px min-h)
                </span>
              </div>

              {/* Center Blueprint Area */}
              <div className="my-auto py-8 text-center space-y-3 border border-dashed border-rule-frame rounded-sm bg-bg-base/60 p-6">
                <div className="flex items-center justify-center gap-2 text-signal-hazard font-mono text-xs uppercase tracking-wider font-semibold">
                  <Terminal className="w-4 h-4" aria-hidden="true" />
                  <span>Hardware Isolation & VSock Terminal Mount</span>
                </div>
                <p className="font-mono text-sm text-ink-primary font-medium max-w-md mx-auto">
                  Reserved for /hero: Interactive Firecracker microVM chamber, real-time vCPU telemetry dials, live stdout, and physical emergency stop latch.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-surface-elevated text-xs font-mono text-ink-muted border border-rule-frame">
                  <span>Asymmetric Grid: Columns 6-12 (1440px) / 100% Width (390px)</span>
                </div>
              </div>

              {/* Footer specs */}
              <div className="flex items-center justify-between border-t border-rule-frame pt-3 text-xs font-mono text-ink-muted">
                <span>Fallback Mode: Static Wireframe Spec</span>
                <span>Sub-Second Freeze Latency: &lt;850ms</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Technical Architecture Proof */}
        <section id="architecture-proof" aria-labelledby="architecture-heading" className="space-y-8">
          <div className="border-b border-rule-frame pb-3">
            <h2 id="architecture-heading" className="font-display font-semibold text-2xl text-ink-primary">
              Technical Architecture & Defense-in-Depth
            </h2>
            <p className="text-sm text-ink-muted">
              Built on verified Linux KVM hypervisor boundaries and bare-metal chroot isolation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pillar 1 */}
            <article className="card p-6 bg-surface-bulkhead border border-rule-frame rounded-md space-y-3 shadow-bulkhead">
              <div className="w-10 h-10 rounded-sm bg-bg-base border border-rule-frame flex items-center justify-center">
                <Lock className="w-5 h-5 text-signal-hazard" aria-hidden="true" />
              </div>
              <h3 className="font-display font-semibold text-lg text-ink-primary">
                KVM hypervisor boundaries
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Runs code in dedicated microVMs with Linux cgroups, chroot jailers, and individual kernels. A container breakout cannot compromise the host.
              </p>
            </article>

            {/* Pillar 2 */}
            <article className="card p-6 bg-surface-bulkhead border border-rule-frame rounded-md space-y-3 shadow-bulkhead">
              <div className="w-10 h-10 rounded-sm bg-bg-base border border-rule-frame flex items-center justify-center">
                <Zap className="w-5 h-5 text-signal-hazard" aria-hidden="true" />
              </div>
              <h3 className="font-display font-semibold text-lg text-ink-primary">
                Sub-second cost ceiling
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                The host proxy meters prompt and completion tokens per millisecond. If spending exceeds your threshold, the microVM is paused immediately.
              </p>
            </article>

            {/* Pillar 3 */}
            <article className="card p-6 bg-surface-bulkhead border border-rule-frame rounded-md space-y-3 shadow-bulkhead">
              <div className="w-10 h-10 rounded-sm bg-bg-base border border-rule-frame flex items-center justify-center">
                <Shield className="w-5 h-5 text-signal-hazard" aria-hidden="true" />
              </div>
              <h3 className="font-display font-semibold text-lg text-ink-primary">
                Outbound domain whitelist
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Network traffic is restricted to approved APIs (such as api.openai.com). API keys are injected at the proxy and never written to the guest disk.
              </p>
            </article>

          </div>
        </section>

        {/* Section 3: Quick Start Guide */}
        <section id="quickstart" aria-labelledby="quickstart-heading" className="card p-6 sm:p-8 bg-surface-bulkhead border border-rule-frame rounded-md space-y-6 shadow-bulkhead">
          <div className="border-b border-rule-frame pb-3">
            <h2 id="quickstart-heading" className="font-display font-semibold text-xl text-ink-primary">
              Start in two commands
            </h2>
            <p className="text-xs text-ink-muted">
              Connect your KVM-enabled Linux server and deploy isolated microVM policies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Box 1: Host Node */}
            <div className="border border-rule-frame rounded-sm bg-bg-base overflow-hidden">
              <div className="bg-surface-elevated px-3 py-2 border-b border-rule-frame flex items-center justify-between text-2xs text-ink-muted">
                <span className="font-semibold text-signal-hazard">HOST HYPERVISOR NODE</span>
                <span>Ubuntu 22.04 • /dev/kvm</span>
              </div>
              <div className="p-4 space-y-2">
                <span className="text-ink-muted block text-2xs uppercase">On your KVM-enabled Linux server:</span>
                <div className="p-3 bg-surface-bulkhead rounded-sm border border-rule-frame text-ink-primary flex items-center justify-between">
                  <code className="text-sm font-bold text-ink-primary">$ sandboxctl host init</code>
                  <span className="text-2xs text-emerald-400 font-mono">host-agent.service</span>
                </div>
                <p className="text-3xs text-ink-muted">
                  Configures cgroups v2, verifies /dev/kvm access, and starts the mTLS daemon.
                </p>
              </div>
            </div>

            {/* Box 2: Developer Workstation */}
            <div className="border border-rule-frame rounded-sm bg-bg-base overflow-hidden">
              <div className="bg-surface-elevated px-3 py-2 border-b border-rule-frame flex items-center justify-between text-2xs text-ink-muted">
                <span className="font-semibold text-ink-primary">LOCAL WORKSTATION</span>
                <span>sandboxctl v1.0 • Python CLI</span>
              </div>
              <div className="p-4 space-y-2">
                <span className="text-ink-muted block text-2xs uppercase">In your project directory:</span>
                <div className="p-3 bg-surface-bulkhead rounded-sm border border-rule-frame text-ink-primary">
                  <code className="text-sm font-bold text-ink-primary">$ sandboxctl deploy --policy '{`{"max_cost_usd": 0.50}`}'</code>
                </div>
                <p className="text-3xs text-ink-muted">
                  Provisions an isolated microVM in &lt;850ms and bridges interactive stdio via VSock.
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
            <Link to="/demo" className="hover:text-ink-primary">
              Demo
            </Link>
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
