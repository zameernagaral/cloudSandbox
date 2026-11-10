import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Shield,
  Activity,
  Cpu,
  CheckCircle2,
  Sliders,
  Lock,
  Layers,
} from 'lucide-react'

type Scenario = 'loop' | 'burst' | 'safe'
type VMState = 'IDLE' | 'CREATING' | 'RUNNING' | 'FROZEN' | 'COMPLETED'

interface LogEntry {
  id: number
  text: string
  type: 'system' | 'agent' | 'gateway' | 'warning' | 'killswitch' | 'success'
  time: string
}

export function InteractiveSimulator() {
  const [scenario, setScenario] = useState<Scenario>('loop')
  const [costCap, setCostCap] = useState<number>(0.01)
  const [vmState, setVmState] = useState<VMState>('IDLE')
  const [cost, setCost] = useState<number>(0)
  const [tokens, setTokens] = useState<number>(0)
  const [requests, setRequests] = useState<number>(0)
  const [cpuUsage, setCpuUsage] = useState<number>(0)
  const [tripLatency, setTripLatency] = useState<number | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const terminalBodyRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const terminalWindowRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight
    }
  }, [logs])

  // Scroll-driven FLIP interpolation from #hero-terminal-anchor (covering bottom-right watermark) into #demo 7-col slot
  useLayoutEffect(() => {
    const updatePosition = () => {
      const termEl = terminalWindowRef.current
      const slotEl = slotRef.current
      const anchorEl = document.getElementById('hero-terminal-anchor')

      if (!termEl || !slotEl) return

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const isDesktop = window.innerWidth >= 1024

      if (reducedMotion || !isDesktop || !anchorEl) {
        termEl.style.transform = 'none'
        termEl.style.zIndex = '10'
        return
      }

      const scrollY = window.scrollY
      const scrollX = window.scrollX

      const anchorRect = anchorEl.getBoundingClientRect()
      const slotRect = slotEl.getBoundingClientRect()

      const startLeft = anchorRect.left + scrollX
      const startTop = anchorRect.top + scrollY
      const startWidth = anchorRect.width

      const endLeft = slotRect.left + scrollX
      const endTop = slotRect.top + scrollY
      const endWidth = slotRect.width

      if (endWidth === 0 || startWidth === 0) {
        termEl.style.transform = 'none'
        return
      }

      // Complete the transition by the time the user scrolls #demo into comfortable view
      const scrollEnd = Math.max(260, endTop - window.innerHeight * 0.35)
      const rawProgress = scrollY / scrollEnd
      const t = Math.min(1, Math.max(0, rawProgress))

      if (t >= 1) {
        termEl.style.transform = 'none'
        termEl.style.zIndex = '10'
      } else {
        // Smooth easing curve
        const e = 1 - Math.pow(1 - t, 2)
        const s0 = startWidth / endWidth
        const scale = s0 + (1 - s0) * e
        const dx = (1 - e) * (startLeft - endLeft)
        const dy = (1 - e) * (startTop - endTop)

        termEl.style.transformOrigin = '0 0'
        termEl.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
        termEl.style.zIndex = '30'
      }
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [])

  const addLog = (
    text: string,
    type: 'system' | 'agent' | 'gateway' | 'warning' | 'killswitch' | 'success' = 'system',
  ) => {
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
      .getMilliseconds()
      .toString()
      .padStart(3, '0')}`

    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), text, type, time: timeStr }])
  }

  const stopSimulation = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const resetDemo = () => {
    stopSimulation()
    setVmState('IDLE')
    setCost(0)
    setTokens(0)
    setRequests(0)
    setCpuUsage(0)
    setTripLatency(null)
    setLogs([
      {
        id: 1,
        text: 'Cloud Sandbox Firecracker Demo Environment ready.',
        type: 'system',
        time: '00:00:00.000',
      },
      {
        id: 2,
        text: 'Click "Start MicroVM & Run Agent" to launch live test.',
        type: 'system',
        time: '00:00:00.001',
      },
    ])
  }

  useEffect(() => {
    resetDemo()
    return () => stopSimulation()
  }, [])

  const startSimulation = () => {
    stopSimulation()
    setVmState('CREATING')
    setCost(0)
    setTokens(0)
    setRequests(0)
    setCpuUsage(12)
    setTripLatency(null)
    setLogs([])

    addLog('[FIRECRACKER] Spawning microVM from rootfs hello-vmlinux v5.10...', 'system')
    addLog('[KVM] Initializing 2 vCPUs, 1024MB RAM, tap0 networking...', 'system')

    setTimeout(() => {
      addLog('[FIRECRACKER] MicroVM booted in 118ms. Guest-agent active on vsock:cid 3:1024', 'system')
      addLog('[GATEWAY] LLM Proxy active on 127.0.0.1:8080. Injecting AES-256 API credentials.', 'system')
      setVmState('RUNNING')
      setCpuUsage(45)

      if (scenario === 'loop') {
        runInfiniteLoopScenario()
      } else if (scenario === 'burst') {
        runBurstScenario()
      } else {
        runSafeScenario()
      }
    }, 400)
  }

  const runInfiniteLoopScenario = () => {
    addLog('[AGENT] Executing rogue_agent.py: Task "Refactor authentication module"', 'agent')

    let currentCost = 0
    let currentTokens = 0
    let reqCount = 0

    timerRef.current = setInterval(() => {
      reqCount += 1
      const addedTokens = 380 + Math.floor(Math.random() * 40)
      const addedCost = 0.0028
      currentTokens += addedTokens
      currentCost = Number((currentCost + addedCost).toFixed(4))

      setRequests(reqCount)
      setTokens(currentTokens)
      setCost(currentCost)
      setCpuUsage(75 + Math.floor(Math.random() * 15))

      addLog(`[AGENT] Outbound POST /v1/chat/completions (OpenAI gpt-4o) [req #${reqCount}]`, 'agent')
      addLog(
        `[GATEWAY] Intercepted request #${reqCount}: +${addedTokens} tokens (Total: $${currentCost.toFixed(4)})`,
        'gateway',
      )

      if (reqCount === 3) {
        addLog('⚠️ [LOOP DETECTION] 3 identical prompt hashes detected within 6 seconds', 'warning')
      }

      if (currentCost >= costCap) {
        stopSimulation()
        const latency = 42 + Math.floor(Math.random() * 8)
        setTripLatency(latency)
        setVmState('FROZEN')
        setCpuUsage(0)

        addLog(`⚡ [KILLSWITCH TRIPPED] Cost cap reached: $${currentCost.toFixed(4)} >= $${costCap.toFixed(4)}`, 'killswitch')
        addLog(`⚡ [ENFORCEMENT] Firecracker microVM instance PAUSED in ${latency}ms via API`, 'killswitch')
        addLog(`🔒 [STATUS] VM execution frozen. Network egress blocked. CPU frozen via cgroup.`, 'killswitch')
      }
    }, 1200)
  }

  const runBurstScenario = () => {
    addLog('[AGENT] Executing batch_scraper_agent.py: Task "Generate 50 unit tests in parallel"', 'agent')

    let currentCost = 0
    let currentTokens = 0
    let reqCount = 0

    timerRef.current = setInterval(() => {
      reqCount += 2
      const addedTokens = 1200
      const addedCost = 0.0055
      currentTokens += addedTokens
      currentCost = Number((currentCost + addedCost).toFixed(4))

      setRequests(reqCount)
      setTokens(currentTokens)
      setCost(currentCost)
      setCpuUsage(92)

      addLog(`[AGENT] Concurrent batch requests #${reqCount - 1} and #${reqCount} dispatched`, 'agent')
      addLog(`[GATEWAY] High token surge: +${addedTokens} tokens. Total: $${currentCost.toFixed(4)}`, 'gateway')

      if (currentCost >= costCap) {
        stopSimulation()
        const latency = 38 + Math.floor(Math.random() * 7)
        setTripLatency(latency)
        setVmState('FROZEN')
        setCpuUsage(0)

        addLog(`⚡ [KILLSWITCH TRIPPED] Cost cap breached ($${currentCost.toFixed(4)} >= $${costCap.toFixed(4)})`, 'killswitch')
        addLog(`⚡ [ENFORCEMENT] Firecracker microVM instance PAUSED in ${latency}ms`, 'killswitch')
      }
    }, 1000)
  }

  const runSafeScenario = () => {
    addLog('[AGENT] Executing unit_test_writer.py: Clean task running within budget', 'agent')

    let currentCost = 0
    let currentTokens = 0
    let reqCount = 0

    timerRef.current = setInterval(() => {
      reqCount += 1
      const addedTokens = 220
      const addedCost = 0.0012
      currentTokens += addedTokens
      currentCost = Number((currentCost + addedCost).toFixed(4))

      setRequests(reqCount)
      setTokens(currentTokens)
      setCost(currentCost)
      setCpuUsage(35)

      addLog(`[AGENT] Completed test file ${reqCount}/2`, 'agent')
      addLog(`[GATEWAY] Intercepted request #${reqCount}: Cost $${currentCost.toFixed(4)}`, 'gateway')

      if (reqCount >= 2) {
        stopSimulation()
        setVmState('COMPLETED')
        setCpuUsage(0)
        addLog(`✅ [SUCCESS] Agent completed task safely within budget ($${currentCost.toFixed(4)} < $${costCap})`, 'success')
        addLog(`[FIRECRACKER] MicroVM gracefully halted. Resources reclaimed.`, 'system')
      }
    }, 1000)
  }

  const handleResumeWithRaisedCap = () => {
    const newCap = Number((costCap + 0.02).toFixed(2))
    setCostCap(newCap)
    setVmState('RUNNING')
    addLog(`[ADMIN] Cost cap increased to $${newCap.toFixed(2)}. Resuming microVM...`, 'system')
    addLog(`[FIRECRACKER] Instance execution resumed. Network egress unblocked.`, 'system')
    setTripLatency(null)

    if (scenario === 'loop') {
      runInfiniteLoopScenario()
    } else if (scenario === 'burst') {
      runBurstScenario()
    }
  }

  const costPercentage = Math.min(100, (cost / costCap) * 100)

  return (
    <section id="demo" aria-labelledby="demo-heading" className="space-y-8 pt-4">
      {/* Top Showcase Header Row (Matches /demo Layout) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-rule-frame pb-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-elevated border border-rule-frame text-xs font-mono text-ink-muted">
            <Zap className="w-3 h-3 text-ink-primary" />
            <span>Academic &amp; Technical Evaluation Showcase</span>
          </div>
          <h2 id="demo-heading" className="font-display font-bold text-2xl sm:text-3xl text-ink-primary">
            Rogue AI Agent Killswitch Demo
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            Demonstrating kernel-level microVM isolation and real-time cost enforcement. When an AI coding agent enters an infinite loop or surges in tokens, the host gateway automatically freezes the microVM in under 50 milliseconds.
          </p>
        </div>

        {/* 3-Col Benchmark Pill Box */}
        <div className="grid grid-cols-3 divide-x divide-rule-frame bg-surface-bulkhead border border-rule-frame rounded-md text-xs font-mono shrink-0">
          <div className="px-4 py-2.5">
            <div className="text-[10px] text-ink-muted uppercase tracking-wider">ISOLATION</div>
            <div className="font-semibold text-ink-primary mt-0.5">Firecracker v1.7</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[10px] text-ink-muted uppercase tracking-wider">KERNEL</div>
            <div className="font-semibold text-ink-primary mt-0.5">Linux 5.10.198</div>
          </div>
          <div className="px-4 py-2.5">
            <div className="text-[10px] text-ink-muted uppercase tracking-wider">TRIP LATENCY</div>
            <div className="font-semibold text-cyan-400 mt-0.5">~42ms</div>
          </div>
        </div>
      </div>

      {/* Main 12-Column Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scenario & Live Telemetry (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Configure Agent Scenario */}
          <div className="card p-5 bg-surface-bulkhead border border-rule-frame rounded-md space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink-primary flex items-center gap-2">
                <Sliders className="w-4 h-4 text-ink-muted" />
                1. Configure Agent Scenario
              </h3>
              <span className="text-xs font-mono text-ink-muted">Policy: Demo Cap</span>
            </div>

            {/* Scenario Buttons */}
            <div className="space-y-2">
              <label className="text-xs text-ink-muted font-medium">Select Behavior Scenario:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScenario('loop')
                    resetDemo()
                  }}
                  className={`p-2.5 rounded-sm border text-left transition-all ${
                    scenario === 'loop'
                      ? 'border-white bg-surface-elevated text-ink-primary'
                      : 'border-rule-frame bg-bg-base/50 text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <RotateCcw className="w-3 h-3 text-ink-primary" />
                    Infinite Loop
                  </div>
                  <div className="text-[10px] text-ink-muted mt-1 leading-tight">Repeated identical calls</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScenario('burst')
                    resetDemo()
                  }}
                  className={`p-2.5 rounded-sm border text-left transition-all ${
                    scenario === 'burst'
                      ? 'border-white bg-surface-elevated text-ink-primary'
                      : 'border-rule-frame bg-bg-base/50 text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-signal-breach" />
                    Token Surge
                  </div>
                  <div className="text-[10px] text-ink-muted mt-1 leading-tight">High concurrency burst</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScenario('safe')
                    resetDemo()
                  }}
                  className={`p-2.5 rounded-sm border text-left transition-all ${
                    scenario === 'safe'
                      ? 'border-white bg-surface-elevated text-ink-primary'
                      : 'border-rule-frame bg-bg-base/50 text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Safe Task
                  </div>
                  <div className="text-[10px] text-ink-muted mt-1 leading-tight">Completes under cap</div>
                </button>
              </div>
            </div>

            {/* Cost Cap Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">Killswitch Cost Cap:</span>
                <span className="font-mono font-bold text-ink-primary">${costCap.toFixed(3)} USD</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.030"
                step="0.005"
                value={costCap}
                disabled={vmState === 'RUNNING'}
                onChange={(e) => setCostCap(parseFloat(e.target.value))}
                className="w-full accent-ink-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink-muted font-mono">
                <span>$0.005 (Strict)</span>
                <span>$0.010 (Demo)</span>
                <span>$0.030 (Relaxed)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              {vmState === 'IDLE' && (
                <button
                  type="button"
                  onClick={startSimulation}
                  className="btn-primary flex-1 justify-center py-2.5"
                >
                  <Play className="w-4 h-4" />
                  Start MicroVM &amp; Run Agent
                </button>
              )}

              {vmState === 'RUNNING' && (
                <button
                  type="button"
                  onClick={() => {
                    stopSimulation()
                    setVmState('FROZEN')
                    setTripLatency(47)
                    addLog('⚡ [ADMIN] Manual Freeze command triggered from UI', 'killswitch')
                  }}
                  className="btn-danger flex-1 justify-center py-2.5"
                >
                  <Pause className="w-4 h-4" />
                  Manual Freeze (Pause VM)
                </button>
              )}

              {vmState === 'FROZEN' && (
                <button
                  type="button"
                  onClick={handleResumeWithRaisedCap}
                  className="btn-primary flex-1 justify-center py-2.5 bg-emerald-600 hover:bg-emerald-500 text-ink-primary"
                >
                  <Play className="w-4 h-4" />
                  Raise Cap &amp; Resume VM
                </button>
              )}

              {vmState === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={startSimulation}
                  className="btn-primary flex-1 justify-center py-2.5"
                >
                  <Play className="w-4 h-4" />
                  Run Again
                </button>
              )}

              <button
                type="button"
                onClick={resetDemo}
                title="Reset Demo"
                className="btn-secondary px-3"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Live Telemetry & MicroVM State */}
          <div className="card p-5 bg-surface-bulkhead border border-rule-frame rounded-md space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink-primary flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                2. Live Telemetry &amp; MicroVM State
              </h3>
              {vmState === 'IDLE' && <span className="badge-stopped">STANDBY</span>}
              {vmState === 'CREATING' && <span className="badge-creating animate-pulse">BOOTING</span>}
              {vmState === 'RUNNING' && <span className="badge-running animate-pulse">RUNNING</span>}
              {vmState === 'FROZEN' && <span className="badge-frozen">FROZEN</span>}
              {vmState === 'COMPLETED' && <span className="badge-running">COMPLETED</span>}
            </div>

            <div className="space-y-4">
              {/* Cost Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-ink-muted">Cost Incurred:</span>
                  <span className="font-bold text-ink-primary">
                    ${cost.toFixed(4)} / ${costCap.toFixed(4)}
                  </span>
                </div>
                <div className="w-full h-2 bg-bg-base rounded-full overflow-hidden border border-rule-frame">
                  <div
                    className={`h-full transition-all duration-300 ${
                      costPercentage >= 100
                        ? 'bg-signal-breach'
                        : costPercentage >= 75
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${costPercentage}%` }}
                  />
                </div>
              </div>

              {/* Tokens & Calls */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-bg-base rounded-sm border border-rule-frame">
                  <div className="text-[11px] text-ink-muted uppercase tracking-wider">TOKENS USED</div>
                  <div className="text-lg font-bold text-ink-primary mt-0.5">{tokens.toLocaleString()}</div>
                </div>

                <div className="p-3 bg-bg-base rounded-sm border border-rule-frame">
                  <div className="text-[11px] text-ink-muted uppercase tracking-wider">INTERCEPTED CALLS</div>
                  <div className="text-lg font-bold text-ink-primary mt-0.5">{requests}</div>
                </div>
              </div>

              {/* vCPU & Memory */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-bg-base rounded-sm border border-rule-frame">
                  <div className="flex items-center justify-between text-[11px] text-ink-muted uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> vCPU
                    </span>
                    <span>2 CORES</span>
                  </div>
                  <div className="text-sm font-semibold text-ink-primary mt-1">{cpuUsage}% active</div>
                </div>

                <div className="p-3 bg-bg-base rounded-sm border border-rule-frame">
                  <div className="flex items-center justify-between text-[11px] text-ink-muted uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" /> MEMORY
                    </span>
                    <span>1024 MB</span>
                  </div>
                  <div className="text-sm font-semibold text-ink-primary mt-1">
                    {vmState === 'IDLE' ? '0 MB' : vmState === 'FROZEN' ? '312 MB (Frozen)' : '312 MB'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Terminal Slot & 3 Defense Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Slot where the Terminal lands as you scroll */}
          <div ref={slotRef} className="relative w-full h-[460px]">
            {/* The Single Simulated Terminal Window (starts small over the Hero bottom-right watermark, grows & moves here on scroll) */}
            <div
              ref={terminalWindowRef}
              id="hero-interactive-chamber"
              style={{ willChange: 'transform' }}
              className="w-full h-full card p-0 overflow-hidden flex flex-col bg-bg-base border border-rule-frame rounded-md shadow-bulkhead"
            >
              {/* Terminal Window Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-rule-frame bg-surface-bulkhead shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-signal-breach/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  <span className="ml-2 text-xs font-mono text-ink-muted">
                    firecracker://sandbox-vm-demo (vsock:cid 3:1024)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-muted font-mono">115200 8N1</span>
                  {vmState === 'FROZEN' && (
                    <span className="badge-frozen text-[10px] py-0 px-1.5">FROZEN</span>
                  )}
                </div>
              </div>

              {/* Terminal Body */}
              <div ref={terminalBodyRef} className="flex-1 bg-[#0A0B0F] p-4 font-mono text-xs overflow-y-auto space-y-1.5 relative select-text">
                {logs.map((log) => (
                  <div key={log.id} className="leading-relaxed flex items-start gap-2">
                    <span className="text-ink-muted/60 text-[10px] select-none shrink-0 pt-0.5">{log.time}</span>
                    <span
                      className={
                        log.type === 'system'
                          ? 'text-ink-muted'
                          : log.type === 'agent'
                          ? 'text-zinc-200'
                          : log.type === 'gateway'
                          ? 'text-cyan-400'
                          : log.type === 'warning'
                          ? 'text-amber-400 font-semibold'
                          : log.type === 'killswitch'
                          ? 'text-cyan-400 font-bold'
                          : 'text-emerald-400 font-semibold'
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))}

                {/* Frozen Overlay */}
                {vmState === 'FROZEN' && (
                  <div className="absolute inset-0 bg-cyan-950/20 backdrop-blur-[1px] border border-cyan-500/30 flex items-center justify-center pointer-events-none">
                    <div className="bg-surface-bulkhead/95 border border-cyan-500/50 px-6 py-3 rounded-md shadow-bulkhead text-center">
                      <div className="text-cyan-400 font-bold text-sm flex items-center justify-center gap-2 font-mono">
                        <Zap className="w-4 h-4 animate-bounce" />
                        MICROVM FROZEN BY KILLSWITCH
                      </div>
                      <div className="text-xs text-ink-muted mt-1 font-mono">
                        Sub-second cost enforcement completed in {tripLatency ?? 47}ms
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal Footer Bar */}
              <div className="px-4 py-2 bg-surface-bulkhead border-t border-rule-frame flex items-center justify-between text-xs text-ink-muted font-mono shrink-0">
                <div>Proxy: 127.0.0.1:8080 (Encrypted Key Injection)</div>
                <div>State: {vmState}</div>
              </div>
            </div>
          </div>

          {/* 3 Academic Architecture Explainer Cards (Matches /demo Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="card p-3.5 space-y-1.5 bg-surface-bulkhead border border-rule-frame rounded-md">
              <div className="flex items-center gap-1.5 text-ink-primary font-semibold text-xs">
                <Shield className="w-4 h-4 shrink-0 text-ink-primary" />
                1. MicroVM Isolation
              </div>
              <p className="text-[11px] text-ink-muted leading-snug">
                Uses Firecracker KVM hardware virtualization. Immune to container breakout; runs a real Linux 5.10 kernel.
              </p>
            </div>

            <div className="card p-3.5 space-y-1.5 bg-surface-bulkhead border border-rule-frame rounded-md">
              <div className="flex items-center gap-1.5 text-ink-primary font-semibold text-xs">
                <Lock className="w-4 h-4 shrink-0 text-ink-primary" />
                2. Key Gateway Proxy
              </div>
              <p className="text-[11px] text-ink-muted leading-snug">
                API keys are AES-256-GCM encrypted and injected by the host proxy. Secrets never enter the VM filesystem.
              </p>
            </div>

            <div className="card p-3.5 space-y-1.5 bg-surface-bulkhead border border-rule-frame rounded-md">
              <div className="flex items-center gap-1.5 text-ink-primary font-semibold text-xs">
                <Zap className="w-4 h-4 shrink-0 text-cyan-400" />
                3. Sub-second Killswitch
              </div>
              <p className="text-[11px] text-ink-muted leading-snug">
                Redis Streams monitor cost &amp; loop patterns. Trips Firecracker pause API in &lt;50ms before bill overruns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
