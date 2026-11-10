import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Terminal } from 'lucide-react'

export function HeroChamber() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isFrozenRef = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFrozen, setIsFrozen] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // 1. Reduced motion check
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    // 2. Save-Data & slow connection check
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string; downlink?: number } }).connection
    if (conn) {
      if (conn.saveData) return
      if (/(^|-)2g|3g/.test(conn.effectiveType || '')) return
      if (typeof conn.downlink === 'number' && conn.downlink > 0 && conn.downlink < 1) return
    }

    const video = videoRef.current
    if (!video) return

    let cancelled = false

    const attachVideo = () => {
      if (cancelled || !video || isFrozenRef.current) return

      const isMobile = window.matchMedia('(max-width: 767px)').matches
      const basePath = '/hero/'
      let targetSrc: string

      if (isMobile) {
        targetSrc = basePath + 'hero-scrub.mp4'
      } else if (video.canPlayType('video/webm; codecs="vp9"')) {
        targetSrc = basePath + 'hero-720.webm'
      } else {
        targetSrc = basePath + 'hero-1080.mp4'
      }

      video.src = targetSrc
      video.preload = 'auto'

      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (!cancelled) setIsPlaying(true)
          })
          .catch(() => {
            if (!cancelled) {
              setHasError(true)
              setIsPlaying(false)
            }
          })
      }
    }

    // Schedule after page load / idle
    const scheduleLoad = () => {
      if ('requestIdleCallback' in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
          .requestIdleCallback(attachVideo, { timeout: 2000 })
      } else {
        setTimeout(attachVideo, 300)
      }
    }

    if (document.readyState === 'complete') {
      scheduleLoad()
    } else {
      window.addEventListener('load', scheduleLoad, { once: true })
    }

    // IntersectionObserver to pause when off-screen (0% CPU)
    let observer: IntersectionObserver | null = null
    if ('IntersectionObserver' in window && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (video && !video.paused && !entry.isIntersecting) {
            video.pause()
          } else if (video && video.paused && entry.isIntersecting && !isFrozenRef.current) {
            video.play().catch(() => {})
          }
        },
        { threshold: 0.1 }
      )
      observer.observe(containerRef.current)
    }

    return () => {
      cancelled = true
      if (observer) observer.disconnect()
      if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
    }
  }, [])

  const handlePullToFreeze = () => {
    isFrozenRef.current = true
    if (videoRef.current) {
      videoRef.current.pause()
    }
    setIsFrozen(true)
  }

  return (
    <section
      ref={containerRef}
      id="hero"
      aria-labelledby="hero-heading"
      className="relative w-full overflow-hidden border-b border-rule-frame bg-bg-base"
    >
      {/* 1. Full-Bleed Ambient Background (Spans ENTIRE Hero Section) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
        {/* Instant LCP Poster Image */}
        <img
          src="/hero/hero-poster.png"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          alt="MicroVM 3D isolation code plane executing in void"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Ambient Video Loop */}
        <video
          ref={videoRef}
          muted
          playsInline
          loop
          preload="none"
          tabIndex={-1}
          onError={() => setHasError(true)}
          onPlaying={() => setIsPlaying(true)}
          aria-label="MicroVM autonomous code execution stream"
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-slow ease-mechanical ${
            isPlaying && !hasError ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Dark Obsidian Scrim (Ensures WCAG AAA contrast without purple/orange gradients) */}
        <div className="absolute inset-0 bg-[#0B0D13]/82" aria-hidden="true" />
      </div>

      {/* 2. Centered Content Layer Directly Over Background */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center space-y-10">
        
        {/* Eyebrow Chip - Crisp Monochrome Slate */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-surface-bulkhead/90 border border-rule-frame text-ink-muted text-xs font-mono uppercase tracking-wider">
          <Terminal className="w-3.5 h-3.5 text-ink-primary" aria-hidden="true" />
          <span>Firecracker v1.7.0 kernel isolation</span>
        </div>

        {/* Display Headline - Chalk White, Solid, Zero Gradients */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1
            id="hero-heading"
            className="font-display font-bold text-3xl sm:text-5xl lg:text-6xl tracking-tight text-ink-primary leading-[1.12]"
          >
            Run AI coding agents in Firecracker microVMs. With sub-second cost-cap killswitches.
          </h1>

          <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto leading-relaxed">
            Contain untrusted LLM tool loops on your own Linux hardware. When an agent enters an infinite loop or exceeds your budget, the killswitch freezes execution in under 1,000 milliseconds.
          </p>
        </div>

        {/* Action Buttons - High-Contrast Industrial Slate & White */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-ink-primary hover:bg-white text-bg-base font-semibold text-sm transition-colors shadow-sm"
            >
              <span>Test run rogue agent</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>

            <a
              href="#architecture-proof"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-surface-bulkhead/90 hover:bg-surface-elevated border border-rule-frame text-ink-primary font-medium text-sm transition-colors"
            >
              Read architecture docs
            </a>
          </div>

          <p className="text-xs font-mono text-ink-muted">
            Pre-configured $0.01 budget cap · <span className="text-emerald-400">Verified freeze latency: under 850ms</span>
          </p>
        </div>

        {/* 3. Horizontal Telemetry Containment Bar (Alternative B) */}
        <div
          id="hero-interactive-chamber"
          aria-label="Containment Chamber Telemetry"
          className="max-w-4xl mx-auto bg-surface-bulkhead/95 border border-rule-frame rounded-sm shadow-bulkhead text-xs font-mono text-left"
        >
          {/* Header strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-rule-frame bg-surface-elevated/40">
            <div className="flex items-center gap-2 text-ink-primary font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  isFrozen ? 'bg-signal-breach' : 'bg-emerald-400'
                }`}
                aria-hidden="true"
              />
              <span className="text-[11px] sm:text-xs">
                Containment chamber #vm-demo-01
              </span>
              <span className="hidden sm:inline text-ink-muted text-[11px]">
                (/run/fc-01.sock)
              </span>
            </div>

            <div className="flex items-center gap-3">
              {hasError && (
                <span className="text-[11px] text-ink-muted">
                  Static snapshot fallback active
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded-sm text-[10px] sm:text-[11px] font-semibold border ${
                  isFrozen
                    ? 'bg-signal-breach/15 text-signal-breach border-signal-breach/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {isFrozen ? 'State: Frozen' : 'State: Armed & Running'}
              </span>
            </div>
          </div>

          {/* Metrics & Control Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-rule-frame">
            <div className="p-3 space-y-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                vCPU Allocation
              </span>
              <span className="text-ink-primary font-medium text-xs sm:text-sm">
                2 Cores (42%)
              </span>
              <span className="block text-[10px] text-ink-muted">Hardware KVM</span>
            </div>

            <div className="p-3 space-y-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                RAM Allocation
              </span>
              <span className="text-ink-primary font-medium text-xs sm:text-sm">
                512 MB (68%)
              </span>
              <span className="block text-[10px] text-ink-muted">cgroup v2 ceiling</span>
            </div>

            <div className="p-3 space-y-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Burn Velocity
              </span>
              <span className="text-ink-primary font-medium text-xs sm:text-sm">
                $0.0034 / sec
              </span>
              <span className="block text-[10px] text-ink-muted">Prompt token metering</span>
            </div>

            <div className="p-3 flex flex-col justify-between space-y-2 bg-surface-elevated/20">
              <div className="space-y-0.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Emergency Stop
                </span>
                <span className="block text-[10px] text-ink-muted">
                  Sub-second killswitch
                </span>
              </div>

              <button
                type="button"
                onClick={handlePullToFreeze}
                disabled={isFrozen}
                className={`w-full px-3 py-1.5 rounded-sm font-mono text-xs font-semibold border transition-all ${
                  isFrozen
                    ? 'bg-signal-breach/20 border-signal-breach text-signal-breach cursor-not-allowed'
                    : 'bg-surface-elevated hover:bg-zinc-800 border-rule-frame text-ink-primary hover:border-zinc-500 active:scale-[0.98]'
                }`}
              >
                {isFrozen ? 'Killswitch Tripped' : 'Pull to freeze'}
              </button>
            </div>
          </div>

          {/* Tripped Notice Stamp */}
          {isFrozen && (
            <div
              role="status"
              className="px-4 py-2 bg-signal-breach/10 border-t border-signal-breach/30 text-signal-breach text-xs font-mono font-semibold flex items-center justify-between"
            >
              <span>[FROZEN] Killswitch tripped at $0.0102</span>
              <span className="text-[11px] text-signal-breach/80">
                MicroVM paused via vsock bridge in 42.4ms
              </span>
            </div>
          )}

        </div>

      </div>
    </section>
  )
}
