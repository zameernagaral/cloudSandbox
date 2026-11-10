import React, { useEffect, useRef, useState } from 'react'

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

    // 2. Save-Data & slow connection check (Network Information API)
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

    // IntersectionObserver to pause when off-screen
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
    <div
      ref={containerRef}
      id="hero-interactive-chamber"
      aria-label="Live MicroVM Containment Chamber"
      className="relative w-full aspect-video lg:aspect-auto lg:min-h-[420px] bg-surface-bulkhead border border-rule-frame rounded-md overflow-hidden shadow-bulkhead hover:shadow-glow-amber transition-shadow duration-fast"
    >
      {/* 1. Static LCP Poster Image */}
      <img
        src="/hero/hero-poster.png"
        width={1920}
        height={1080}
        fetchPriority="high"
        decoding="async"
        alt="Three-dimensional isometric code block glowing in an isolated virtual machine void"
        className="absolute inset-0 w-full height-full h-full object-cover select-none pointer-events-none"
      />

      {/* 2. Ambient Video Layer */}
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
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-fast ease-mechanical pointer-events-none ${
          isPlaying && !hasError ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 3. Dark Vignette Overlay for Depth */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(11,13,19,0.75)_100%)]"
        aria-hidden="true"
      />

      {/* 4. Real Semantic HTML Telemetry Overlay */}
      <div className="relative z-10 h-full p-3 sm:p-4 flex flex-col justify-between pointer-events-none">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-surface-bulkhead/90 backdrop-blur-sm border border-rule-frame rounded-sm px-3 py-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-ink-primary font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                isFrozen ? 'bg-signal-breach' : 'bg-signal-hazard animate-pulse'
              }`}
              aria-hidden="true"
            />
            <span>Containment chamber #vm-demo-01</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-sm text-[11px] font-semibold border ${
              isFrozen
                ? 'bg-signal-breach/15 text-signal-breach border-signal-breach/30'
                : 'bg-signal-hazard/15 text-signal-hazard border-signal-hazard/30'
            }`}
          >
            {isFrozen ? 'Frozen' : 'Running'}
          </span>
        </div>

        {/* Decode Failure Notice (if video fails) */}
        {hasError && (
          <div
            role="status"
            className="self-start bg-surface-bulkhead/95 border border-rule-frame rounded-sm px-2.5 py-1 text-xs font-mono text-ink-muted"
          >
            Hardware video decode unavailable. Displaying static containment snapshot.
          </div>
        )}

        {/* Footer Metrics & Killswitch Deck */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-end justify-between">
          
          {/* Telemetry Matrix */}
          <div className="bg-surface-bulkhead/90 backdrop-blur-sm border border-rule-frame rounded-sm p-2.5 sm:p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
            <div>
              <span className="block text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
                vCPU allocation
              </span>
              <span className="text-ink-primary font-medium">2 Cores (42%)</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
                RAM allocation
              </span>
              <span className="text-ink-primary font-medium">512 MB (68%)</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
                Burn velocity
              </span>
              <span className="text-signal-hazard font-medium">$0.0034/sec</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
                VSock path
              </span>
              <span className="text-ink-primary font-medium">/run/fc-01.sock</span>
            </div>
          </div>

          {/* Mechanical Emergency Stop Latch */}
          <div className="bg-surface-bulkhead/90 backdrop-blur-sm border border-rule-frame border-t-2 border-t-signal-hazard rounded-sm p-2.5 sm:p-3 text-xs font-mono space-y-2 pointer-events-auto">
            <div className="space-y-0.5">
              <span className="block text-[10px] tracking-wider text-ink-muted uppercase">
                Live stdout (/bin/bash via vsock)
              </span>
              <span className="block font-semibold text-ink-primary text-xs">Emergency stop</span>
            </div>

            <button
              type="button"
              onClick={handlePullToFreeze}
              disabled={isFrozen}
              className={`w-full px-3 py-1.5 rounded-sm font-mono font-semibold text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-signal-hazard ${
                isFrozen
                  ? 'bg-signal-breach/20 border-signal-breach text-signal-breach cursor-not-allowed'
                  : 'bg-surface-elevated hover:bg-signal-hazard/20 border-signal-hazard text-ink-primary active:scale-[0.98]'
              }`}
            >
              {isFrozen ? 'Killswitch Engaged' : 'Pull to freeze'}
            </button>

            {isFrozen && (
              <div
                role="status"
                className="text-[11px] font-mono text-signal-breach font-semibold pt-1 border-t border-rule-frame"
              >
                [FROZEN] Killswitch tripped at $0.0102
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
