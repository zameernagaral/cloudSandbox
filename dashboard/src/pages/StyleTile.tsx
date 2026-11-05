import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldAlert, CheckCircle2, Zap, Play, Terminal } from 'lucide-react'

export function StyleTile() {
  const [motionTrigger, setMotionTrigger] = useState(false)
  const [activeTab, setActiveTab] = useState<'fast' | 'normal' | 'slow'>('normal')

  const swatches = [
    {
      name: '--color-bg-base',
      hex: '#0B0D13',
      role: 'Background Canvas',
      contrast: 'Base Level (L: 0.004)',
      bgClass: 'bg-[#0B0D13]',
      textClass: 'text-ink-primary',
      borderClass: 'border-[#2B3448]',
      wcag: 'Canvas',
    },
    {
      name: '--color-surface-bulkhead',
      hex: '#161B26',
      role: 'Armored Panel Cards',
      contrast: '15.8:1 on Chalk Ink',
      bgClass: 'bg-[#161B26]',
      textClass: 'text-ink-primary',
      borderClass: 'border-[#2B3448]',
      wcag: 'AAA',
    },
    {
      name: '--color-surface-elevated',
      hex: '#1E2536',
      role: 'Elevated Drawers & Trays',
      contrast: '13.2:1 on Chalk Ink',
      bgClass: 'bg-[#1E2536]',
      textClass: 'text-ink-primary',
      borderClass: 'border-[#2B3448]',
      wcag: 'AAA',
    },
    {
      name: '--color-rule-frame',
      hex: '#2B3448',
      role: '1px Structural Framing',
      contrast: '3.8:1 UI Border',
      bgClass: 'bg-[#2B3448]',
      textClass: 'text-ink-primary',
      borderClass: 'border-[#1E2536]',
      wcag: 'UI Frame',
    },
    {
      name: '--color-ink-primary',
      hex: '#F1F5F9',
      role: 'Chalk Primary Text & Headings',
      contrast: '17.6:1 on Base Void',
      bgClass: 'bg-[#F1F5F9]',
      textClass: 'text-[#0B0D13]',
      borderClass: 'border-[#F1F5F9]',
      wcag: 'AAA Pass',
    },
    {
      name: '--color-ink-muted',
      hex: '#94A3B8',
      role: 'Steel Muted Metadata & Paths',
      contrast: '7.7:1 on Base Void',
      bgClass: 'bg-[#94A3B8]',
      textClass: 'text-[#0B0D13]',
      borderClass: 'border-[#94A3B8]',
      wcag: 'AAA Pass (4.5:1+)',
    },
    {
      name: '--color-signal-hazard',
      hex: '#F59E0B',
      role: 'Safety Warning Amber (2-4% budget)',
      contrast: '8.9:1 on Base Void',
      bgClass: 'bg-[#F59E0B]',
      textClass: 'text-[#0B0D13]',
      borderClass: 'border-[#F59E0B]',
      wcag: 'AAA UI / AA Text',
    },
    {
      name: '--color-signal-breach',
      hex: '#EF4444',
      role: 'Emergency Killswitch Red',
      contrast: '4.7:1 on Base Void',
      bgClass: 'bg-[#EF4444]',
      textClass: 'text-[#FFFFFF]',
      borderClass: 'border-[#EF4444]',
      wcag: 'AA Normal / AAA UI',
    },
  ]

  const typeScale = [
    {
      tag: 'Display (Fluid Clamp)',
      size: 'clamp(2rem, 1.5rem + 2.5vw, 2.75rem)',
      weight: '700 Bold',
      font: 'Space Grotesk',
      sample: 'Firecracker microVM Containment',
      tracking: '-0.025em',
      className: 'font-display font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-ink-primary',
    },
    {
      tag: 'Page Title (2XL)',
      size: '31.25px / 1.95rem',
      weight: '700 Bold',
      font: 'Space Grotesk',
      sample: 'Hardware Isolation & Cost-Cap Cockpit',
      tracking: '-0.02em',
      className: 'font-display font-bold text-2xl sm:text-3xl tracking-tight text-ink-primary',
    },
    {
      tag: 'Section Header (XL)',
      size: '25px / 1.56rem',
      weight: '600 Semibold',
      font: 'Space Grotesk',
      sample: 'Live Execution Ring Buffer & Telemetry',
      tracking: '-0.015em',
      className: 'font-display font-semibold text-xl sm:text-2xl text-ink-primary',
    },
    {
      tag: 'Card Title (LG)',
      size: '20px / 1.25rem',
      weight: '600 Semibold',
      font: 'IBM Plex Sans',
      sample: 'Containment Chamber #fc-c840f1',
      tracking: '0',
      className: 'font-sans font-semibold text-lg sm:text-xl text-ink-primary',
    },
    {
      tag: 'Base Body Text',
      size: '16px / 1.0rem',
      weight: '400 Regular',
      font: 'IBM Plex Sans',
      sample: 'When an autonomous agent enters an infinite loop or exceeds budget, the host killswitch freezes execution in under 1,000 milliseconds.',
      tracking: '0',
      className: 'font-sans font-normal text-base text-ink-primary leading-relaxed',
    },
    {
      tag: 'Secondary / Form Label (SM)',
      size: '14px / 0.875rem',
      weight: '500 Medium',
      font: 'IBM Plex Sans',
      sample: 'Hard spend cap (USD): $0.0100 · vCPU pinning active (2x AMD EPYC)',
      tracking: '0',
      className: 'font-sans font-medium text-sm text-ink-muted',
    },
    {
      tag: 'Telemetry Log (XS)',
      size: '12px / 0.75rem',
      weight: '500 Medium',
      font: 'JetBrains Mono',
      sample: '[2026-11-05 14:22:18.042] vsock:1024 -> /srv/jailer/fc-c840f1/root (burn: $0.0034/s)',
      tracking: '+0.02em',
      className: 'font-mono font-medium text-xs text-signal-hazard',
    },
    {
      tag: 'Micro-Badge (2XS)',
      size: '10px / 0.625rem',
      weight: '600 Semibold Uppercase',
      font: 'JetBrains Mono',
      sample: 'KVM VCPU 0: READY · MEMORY.MAX: 1024MB · AIRLOCK SEALED',
      tracking: '+0.08em',
      className: 'font-mono font-semibold text-[10px] uppercase tracking-wider text-emerald-400',
    },
  ]

  const spaceScale = [
    { name: '--space-1', px: '4px', rem: '0.25rem', width: 'w-1' },
    { name: '--space-2', px: '8px', rem: '0.5rem', width: 'w-2' },
    { name: '--space-3', px: '12px', rem: '0.75rem', width: 'w-3' },
    { name: '--space-4', px: '16px', rem: '1.0rem', width: 'w-4' },
    { name: '--space-5', px: '20px', rem: '1.25rem', width: 'w-5' },
    { name: '--space-6', px: '24px', rem: '1.5rem', width: 'w-6' },
    { name: '--space-8', px: '32px', rem: '2.0rem', width: 'w-8' },
    { name: '--space-10', px: '40px', rem: '2.5rem', width: 'w-10' },
    { name: '--space-12', px: '48px', rem: '3.0rem', width: 'w-12' },
    { name: '--space-16', px: '64px', rem: '4.0rem', width: 'w-16' },
  ]

  return (
    <div className="min-h-screen bg-bg-base text-ink-primary font-sans antialiased selection:bg-signal-hazard/20 selection:text-signal-hazard">
      {/* Robots meta tag for style tile */}
      <meta name="robots" content="noindex, nofollow" />

      {/* Top Breadcrumb Bar */}
      <header className="border-b border-rule-frame bg-surface-bulkhead/80 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-muted hover:text-ink-primary transition-colors duration-fast"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Fleet</span>
          </Link>
          <span className="text-rule-frame">/</span>
          <span className="text-xs font-mono font-medium text-signal-hazard uppercase tracking-wider">
            Style Tile Specification
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Tokens Active
          </span>
          <span className="text-xs font-mono text-ink-muted">Direction 1: Containment Airlock</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16">
        
        {/* Title Deck */}
        <section className="space-y-2 border-b border-rule-frame pb-6">
          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-sm bg-signal-hazard/10 border border-signal-hazard/20 text-signal-hazard text-xs font-mono uppercase tracking-wider">
            <Zap className="w-3 h-3" />
            <span>Airlock Design Tokens</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-ink-primary">
            Cloud Sandbox Style Tile
          </h1>
          <p className="text-sm sm:text-base text-ink-muted max-w-3xl leading-relaxed">
            Live token verification deck for Direction 1 ("Containment Airlock"). Demonstrates color contrast ratios, 
            machine typography scales, 4px spatial rhythm, stamped border radii, and mechanical spring motion physics.
          </p>
        </section>

        {/* 1. Color Palette & WCAG Contrast Matrix */}
        <section className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-rule-frame pb-2">
            <div>
              <h2 className="font-display font-semibold text-xl text-ink-primary">1. Colour Palette & Contrast</h2>
              <p className="text-xs text-ink-muted">Strict 5-6 token system with safety hazard accents (at most 2-5% screen budget).</p>
            </div>
            <span className="text-xs font-mono text-ink-muted">WCAG AA & AAA Verified</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {swatches.map((s) => (
              <div
                key={s.name}
                className="card p-4 space-y-3 bg-surface-bulkhead border border-rule-frame rounded-md hover:border-signal-hazard/40 transition-colors duration-normal"
              >
                <div
                  className={`h-20 w-full rounded-sm border ${s.borderClass} ${s.bgClass} flex items-end p-2 shadow-inner`}
                >
                  <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${s.textClass} bg-black/40 backdrop-blur`}>
                    {s.hex}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-ink-primary">{s.name}</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-sm text-[10px] font-mono bg-ink-muted/15 text-ink-primary border border-rule-frame">
                      {s.wcag}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">{s.role}</p>
                  <p className="text-[11px] font-mono text-signal-hazard/90">{s.contrast}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Typography Scale */}
        <section className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-rule-frame pb-2">
            <div>
              <h2 className="font-display font-semibold text-xl text-ink-primary">2. Typography Scale & Fonts</h2>
              <p className="text-xs text-ink-muted">Space Grotesk (display), IBM Plex Sans (body), and JetBrains Mono (telemetry).</p>
            </div>
            <span className="text-xs font-mono text-ink-muted">Base 16px · Ratio 1.25</span>
          </div>

          <div className="card divide-y divide-rule-frame bg-surface-bulkhead border border-rule-frame rounded-md overflow-hidden">
            {typeScale.map((t, idx) => (
              <div key={idx} className="p-4 sm:p-5 space-y-2 hover:bg-surface-elevated/40 transition-colors duration-fast">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-ink-muted">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-sm bg-rule-frame/60 text-ink-primary font-semibold">
                      {t.tag}
                    </span>
                    <span>{t.font} ({t.weight})</span>
                  </div>
                  <span>Size: {t.size} · Tracking: {t.tracking}</span>
                </div>
                <div className={t.className}>
                  {t.sample}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. 4px Base Spacing Rhythm */}
        <section className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-rule-frame pb-2">
            <div>
              <h2 className="font-display font-semibold text-xl text-ink-primary">3. 4px Base Spacing Rhythm</h2>
              <p className="text-xs text-ink-muted">Strict multiples of 4px for deterministic layout rhythm across mobile and desktop.</p>
            </div>
            <span className="text-xs font-mono text-ink-muted">4px Scale (1-16)</span>
          </div>

          <div className="card p-5 bg-surface-bulkhead border border-rule-frame rounded-md space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {spaceScale.map((sp) => (
                <div key={sp.name} className="p-3 bg-bg-base border border-rule-frame rounded-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-signal-hazard font-semibold">{sp.name}</span>
                    <span className="text-ink-muted">{sp.px}</span>
                  </div>
                  <div className="h-4 bg-rule-frame/40 rounded-none overflow-hidden">
                    <div className={`h-full bg-signal-hazard/70 ${sp.width}`} />
                  </div>
                  <span className="text-[10px] font-mono text-ink-muted/70 block">{sp.rem}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Shape, Radii & Structural Rules */}
        <section className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-rule-frame pb-2">
            <div>
              <h2 className="font-display font-semibold text-xl text-ink-primary">4. Shape, Radii & Bulkhead Framing</h2>
              <p className="text-xs text-ink-muted">Mechanical machine corners justifying why consumer roundness is avoided.</p>
            </div>
            <span className="text-xs font-mono text-ink-muted">Architectural Radii</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="card p-4 bg-surface-bulkhead border border-rule-frame rounded-none space-y-2">
              <span className="text-xs font-mono text-signal-hazard font-semibold">--radius-none (0px)</span>
              <p className="text-xs text-ink-muted">Data tables, live Xterm.js terminal frames, and telemetry bars.</p>
              <div className="h-10 bg-bg-base border border-rule-frame rounded-none flex items-center justify-center text-xs font-mono text-ink-muted">
                Unrounded Console Edge
              </div>
            </div>

            <div className="card p-4 bg-surface-bulkhead border border-rule-frame rounded-sm space-y-2">
              <span className="text-xs font-mono text-signal-hazard font-semibold">--radius-sm (4px)</span>
              <p className="text-xs text-ink-muted">Interactive chips, metric pills, and stamped status badges.</p>
              <div className="h-10 bg-bg-base border border-rule-frame rounded-sm flex items-center justify-center text-xs font-mono text-ink-muted">
                Stamped Machine Corner
              </div>
            </div>

            <div className="card p-4 bg-surface-bulkhead border border-rule-frame rounded-md space-y-2">
              <span className="text-xs font-mono text-signal-hazard font-semibold">--radius-md (6px)</span>
              <p className="text-xs text-ink-muted">Primary containment bulkhead cards and modular trays.</p>
              <div className="h-10 bg-bg-base border border-rule-frame rounded-md flex items-center justify-center text-xs font-mono text-ink-muted">
                Bulkhead Container
              </div>
            </div>

            <div className="card p-4 bg-surface-bulkhead border border-rule-frame rounded-md space-y-2">
              <span className="text-xs font-mono text-signal-hazard font-semibold">--radius-full (9999px)</span>
              <p className="text-xs text-ink-muted">Physical toggle handles and circular alive status dots.</p>
              <div className="h-10 bg-bg-base border border-rule-frame rounded-full flex items-center justify-center text-xs font-mono text-ink-muted">
                Emergency Switch Toggle
              </div>
            </div>
          </div>
        </section>

        {/* 5. Mechanical Motion & Spring Easing */}
        <section className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-rule-frame pb-2">
            <div>
              <h2 className="font-display font-semibold text-xl text-ink-primary">5. Mechanical Motion & Spring Durations</h2>
              <p className="text-xs text-ink-muted">Single easing: cubic-bezier(0.16, 1, 0.3, 1) — brisk initial snap, firm lock.</p>
            </div>
            <span className="text-xs font-mono text-ink-muted">120ms · 240ms · 480ms</span>
          </div>

          <div className="card p-6 bg-surface-bulkhead border border-rule-frame rounded-md space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('fast')}
                  className={`px-3 py-1 text-xs font-mono rounded-sm border transition-colors ${
                    activeTab === 'fast'
                      ? 'bg-signal-hazard text-bg-base border-signal-hazard font-semibold'
                      : 'bg-bg-base text-ink-muted border-rule-frame hover:text-ink-primary'
                  }`}
                >
                  Fast (120ms) — Micro feedback
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('normal')}
                  className={`px-3 py-1 text-xs font-mono rounded-sm border transition-colors ${
                    activeTab === 'normal'
                      ? 'bg-signal-hazard text-bg-base border-signal-hazard font-semibold'
                      : 'bg-bg-base text-ink-muted border-rule-frame hover:text-ink-primary'
                  }`}
                >
                  Normal (240ms) — Drawer/Panel
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('slow')}
                  className={`px-3 py-1 text-xs font-mono rounded-sm border transition-colors ${
                    activeTab === 'slow'
                      ? 'bg-signal-hazard text-bg-base border-signal-hazard font-semibold'
                      : 'bg-bg-base text-ink-muted border-rule-frame hover:text-ink-primary'
                  }`}
                >
                  Slow (480ms) — Breach latch
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMotionTrigger(!motionTrigger)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Test Easing Transition</span>
              </button>
            </div>

            {/* Visual Motion Track */}
            <div className="p-4 bg-bg-base border border-rule-frame rounded-sm space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                <span>Active Easing: cubic-bezier(0.16, 1, 0.3, 1)</span>
                <span>Travel Distance: max 16px</span>
              </div>
              
              <div className="h-12 w-full bg-surface-bulkhead border border-rule-frame rounded-sm relative flex items-center px-2">
                <div
                  className={`h-8 w-28 rounded-sm bg-signal-hazard text-bg-base font-mono font-semibold text-xs flex items-center justify-center shadow-glow-amber transition-all ${
                    activeTab === 'fast'
                      ? 'duration-fast'
                      : activeTab === 'normal'
                      ? 'duration-normal'
                      : 'duration-slow'
                  } ease-mechanical ${motionTrigger ? 'translate-x-4 bg-signal-breach text-white shadow-glow-red' : 'translate-x-0'}`}
                >
                  {motionTrigger ? 'TRIPPED [!] ' : 'ARMED [✓]'}
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}

