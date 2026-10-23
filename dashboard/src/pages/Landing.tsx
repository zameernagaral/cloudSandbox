import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Zap, Terminal, GitBranch, ChevronRight, Lock, Activity } from 'lucide-react'

export function Landing() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-accent" />
          </div>
          <span className="font-semibold text-base tracking-tight">Cloud Sandbox</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://github.com/your-org/cloud-sandbox" className="text-text-dim hover:text-text text-sm transition-colors">
            GitHub
          </a>
          <Link to="/auth/login" className="btn-secondary text-xs">
            Sign in
          </Link>
          <Link to="/auth/register" className="btn-primary text-xs">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-8">
          <Zap className="w-3 h-3" />
          Killswitch trips in &lt;1 second
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight max-w-4xl mb-6">
          AI coding agents that can't{' '}
          <span className="gradient-text">burn your cloud bill</span>
        </h1>
        <p className="text-lg text-text-dim max-w-2xl mb-10">
          Run AI agents in isolated Firecracker microVMs on your own infrastructure.
          Automatic killswitches pause runaway agents the moment they exceed your cost, token, or compute limits.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/auth/register" className="btn-primary px-6 py-3 text-base">
            Deploy your first sandbox
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-frozen/30 text-frozen hover:bg-frozen/10 font-medium text-base transition-all"
          >
            <Activity className="w-4 h-4" />
            Watch rogue agent demo
          </Link>
        </div>
      </section>

      {/* Terminal demo mockup */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 mb-24">
        <div className="card p-0 overflow-hidden glow-accent">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-surface/80">
            <div className="w-3 h-3 rounded-full bg-danger/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
            <span className="ml-3 text-xs text-muted font-mono">sandbox/demo-rogue-agent</span>
            <div className="ml-auto badge-running text-xs">RUNNING</div>
          </div>
          <div className="font-mono text-xs p-6 bg-bg space-y-1.5 leading-relaxed">
            <div className="text-muted">$ python rogue_agent.py --infinite-loop</div>
            <div className="text-text-dim">Calling OpenAI gpt-4o... [request #1]</div>
            <div className="text-text-dim">Calling OpenAI gpt-4o... [request #2]</div>
            <div className="text-text-dim">Calling OpenAI gpt-4o... [request #3]</div>
            <div className="text-warning">⚠ Loop detected: 3 identical requests in 8s</div>
            <div className="text-text-dim">Calling OpenAI gpt-4o... [request #4]</div>
            <div className="text-frozen font-semibold">
              ⚡ KILLSWITCH TRIPPED — cost cap $0.01 reached
            </div>
            <div className="text-frozen">   trip_to_pause_latency_ms: 47ms</div>
            <div className="text-frozen">   VM state: FROZEN — agent cannot make further requests</div>
            <div className="text-muted mt-2">— Resume, raise cap, or destroy —</div>
          </div>
          <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-frozen/5">
            <div className="flex items-center gap-4 text-xs text-text-dim">
              <span>Cost: <span className="text-frozen font-medium">$0.0102</span> / $0.01</span>
              <span>Tokens: <span className="text-text">1,284</span></span>
              <span>Latency: <span className="text-success font-medium">47ms</span></span>
            </div>
            <span className="badge-frozen">FROZEN</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 mb-24">
        <h2 className="text-2xl font-bold text-center mb-12">Why Cloud Sandbox?</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: <Lock className="w-5 h-5 text-accent" />,
              title: 'Zero trust isolation',
              desc: 'Every agent runs in its own Firecracker microVM behind the jailer — seccomp, cgroups, and a private network. Your host machine is never touched.',
            },
            {
              icon: <Zap className="w-5 h-5 text-warning" />,
              title: 'Sub-second killswitch',
              desc: 'The monitor evaluates cost, token, CPU, and loop detection limits every 100ms. When tripped, the PATCH /vm Paused call completes in under a second.',
            },
            {
              icon: <GitBranch className="w-5 h-5 text-success" />,
              title: 'Self-hosted on your cloud',
              desc: 'One `sandboxctl host init` command provisions Firecracker and the host agent on your machine. Your keys, your infra — no vendor lock-in.',
            },
          ].map((f) => (
            <div key={f.title} className="card p-6 hover:border-accent/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-text-dim leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick start */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 mb-24">
        <h2 className="text-2xl font-bold text-center mb-8">Start in two commands</h2>
        <div className="card p-6 font-mono text-sm space-y-3">
          <div>
            <div className="text-muted text-xs mb-1.5">On your KVM-enabled server:</div>
            <div className="bg-bg rounded p-3 text-text-dim">
              <span className="text-accent">$</span> sandboxctl host init
            </div>
          </div>
          <div>
            <div className="text-muted text-xs mb-1.5">In your project directory:</div>
            <div className="bg-bg rounded p-3 text-text-dim">
              <span className="text-accent">$</span> sandboxctl deploy --policy <span className="text-warning">'{`{"max_cost_usd": 0.50}`}'</span>
              <div className="mt-1 text-success">→ https://app.cloudsandbox.dev/sandbox/sb_abc123</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-8 py-8 flex items-center justify-between text-xs text-muted">
        <span>© 2026 Cloud Sandbox. Open source.</span>
        <div className="flex gap-4">
          <a href="/api/docs" className="hover:text-text transition-colors">API Docs</a>
          <a href="https://github.com/your-org/cloud-sandbox" className="hover:text-text transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  )
}
