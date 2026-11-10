import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight, Terminal } from 'lucide-react'

export function HeroChamber() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
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
      if (cancelled || !video) return

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
          } else if (video && video.paused && entry.isIntersecting) {
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

  return (
    <section
      ref={containerRef}
      id="hero"
      aria-labelledby="hero-heading"
      className="relative z-10 w-full min-h-[84vh] flex items-center justify-center overflow-hidden border-b border-rule-frame bg-bg-base"
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

        {/* Subtle Dark Contrast Scrim */}
        <div className="absolute inset-0 bg-[#0B0D13]/65" aria-hidden="true" />

        {/* Bottom-Right Watermark Cover Mask (ensures the bottom-right video watermark is never visible) */}
        <div
          className="absolute right-0 bottom-0 w-72 h-48 bg-[radial-gradient(circle_at_68%_68%,#0B0D13_45%,rgba(11,13,19,0.92)_65%,transparent_100%)]"
          aria-hidden="true"
        />
      </div>

      {/* 2. Centered Hero Statements & CTAs (No centered terminal box blocking the 3D cube) */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-surface-bulkhead/90 border border-rule-frame text-ink-muted text-xs font-mono uppercase tracking-wider">
          <Terminal className="w-3.5 h-3.5 text-ink-primary" aria-hidden="true" />
          <span>Firecracker v1.7.0 kernel isolation</span>
        </div>

        <div className="space-y-4">
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

        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-ink-primary hover:bg-white text-bg-base font-semibold text-sm transition-colors shadow-sm"
            >
              <span>Test run rogue agent</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>

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
      </div>

      {/* 3. Anchor Box over the Bottom-Right Watermark where the Demo Terminal starts before expanding on scroll */}
      <div
        id="hero-terminal-anchor"
        aria-hidden="true"
        className="hidden lg:block absolute right-7 bottom-6 w-[260px] h-[168px] pointer-events-none"
      />
    </section>
  )
}
