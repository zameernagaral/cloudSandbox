import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Shield,
  Clock,
  Activity,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Terminal as TerminalIcon,
  Sliders,
  ArrowRight,
  Lock,
  Layers,
  ChevronRight,
} from 'lucide-react'

type Scenario = 'loop' | 'burst' | 'safe'
type VMState = 'IDLE' | 'CREATING' | 'RUNNING' | 'FROZEN' | 'COMPLETED'

interface LogEntry {
  id: number
  text: string
  type: 'system' | 'agent' | 'gateway' | 'warning' | 'killswitch' | 'success'
  time: string
}

export function RogueAgentDemo() {
  const [scenario, setScenario] = useState<Scenario>('loop')
  const [costCap, setCostCap] = useState<number>(0.01)
  const [vmState, setVmState] = useState<VMState>('IDLE')
  const [cost, setCost] = useState<number>(0)
  const [tokens, setTokens] = useState<number>(0)
  const [requests, setRequests] = useState<number>(0)
  const [cpuUsage, setCpuUsage] = useState<number>(0)
  const [tripLatency, setTripLatency] = useState<number | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const terminalEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stepRef = useRef<number>(0)

  // Scroll to bottom of terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

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
    stepRef.current = 0
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
    stepRef.current = 0
    setVmState('CREATING')
    setCost(0)
    setTokens(0)
    setRequests(0)
    setCpuUsage(12)
    setTripLatency(null)
    setLogs([])

    addLog('[FIRECRACKER] Spawning microVM from rootfs hello-vmlinux v5.10...', 'system')
    addLog('[KVM] Initializing 2 vCPUs, 1024MB RAM, tap0 networking...', 'system')

    // Boot sequence delay (simulated 180ms Firecracker boot)
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
      const addedCost = 0.0028 // ~$0.0028 per gpt-4o request
      currentTokens += addedTokens
      currentCost = Number((currentCost + addedCost).toFixed(4))

      setRequests(reqCount)
      setTokens(currentTokens)
      setCost(currentCost)
      setCpuUsage(75 + Math.floor(Math.random() * 15))

      addLog(
        `[AGENT] Outbound POST /v1/chat/completions (OpenAI gpt-4o) [req #${reqCount}]`,
        'agent',
      )
      addLog(
        `[GATEWAY] Intercepted request #${reqCount}: +${addedTokens} tokens (Total cost: $${currentCost.toFixed(
          4,
        )})`,
        'gateway',
      )

      if (reqCount === 3) {
        addLog(
          '⚠️ [LOOP DETECTION] 3 identical prompt hashes detected within 6 seconds!',
          'warning',
        )
      }

      // Check if cost exceeded cap
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
    }, 1500)
  }

  const handleResumeWithRaisedCap = () => {
    const newCap = Number((costCap + 0.02).toFixed(2))
    setCostCap(newCap)
    setVmState('RUNNING')
    addLog(`[ADMIN] Cost cap increased to $${newCap.toFixed(2)}. Resuming microVM...`, 'system')
    addLog(`[FIRECRACKER] Instance execution resumed. Network egress unblocked.`, 'system')
    setTripLatency(null)

    // Continue running
    if (scenario === 'loop') {
      runInfiniteLoopScenario()
    } else if (scenario === 'burst') {
      runBurstScenario()
    }
  }

  const costPercentage = Math.min(100, (cost / costCap) * 100)

  return (
    <div className="min-h-screen bg-bg text-text pb-16">
      {/* Top Header / Nav */}
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <TerminalIcon className="w-4 h-4 text-accent" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight">Cloud Sandbox</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-frozen/15 text-frozen border border-frozen/30">
                  LIVE DEMO
                </span>
              </div>
              <p className="text-xs text-text-dim">Sub-second Firecracker MicroVM Killswitch</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="btn-secondary text-xs">
              Open Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-3">
              <Zap className="w-3.5 h-3.5" />
              Academic & Technical Evaluation Showcase
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Rogue AI Agent <span className="gradient-text">Killswitch Demo</span>
            </h1>
            <p className="text-sm text-text-dim mt-1 max-w-2xl">
              Demonstrating kernel-level microVM isolation and real-time cost enforcement. When an AI coding agent enters an infinite loop or surges in tokens, the host gateway automatically freezes the microVM in under 50 milliseconds.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3 shrink-0">
            <div className="px-3 border-r border-border">
              <div className="text-[11px] text-muted uppercase tracking-wider font-mono">Isolation</div>
              <div className="text-xs font-semibold text-text">Firecracker v1.7</div>
            </div>
            <div className="px-3 border-r border-border">
              <div className="text-[11px] text-muted uppercase tracking-wider font-mono">Kernel</div>
              <div className="text-xs font-semibold text-text">Linux 5.10.198</div>
            </div>
            <div className="px-3">
              <div className="text-[11px] text-muted uppercase tracking-wider font-mono">Trip Latency</div>
              <div className="text-xs font-bold text-frozen">~42ms</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Demo Container */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controls & Live Telemetry (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Simulation Control Card */}
          <div className="card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent" />
                1. Configure Agent Scenario
              </h2>
              <span className="text-xs text-muted font-mono">Policy: Demo Cap</span>
            </div>

            {/* Scenario Buttons */}
            <div className="space-y-2">
              <label className="text-xs text-text-dim font-medium">Select Behavior Scenario:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScenario('loop')
                    resetDemo()
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    scenario === 'loop'
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border bg-bg/50 text-text-dim hover:text-text'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <RotateCcw className="w-3 h-3 text-warning" />
                    Infinite Loop
                  </div>
                  <div className="text-[10px] text-muted mt-1 leading-tight">Repeated identical calls</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScenario('burst')
                    resetDemo()
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    scenario === 'burst'
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border bg-bg/50 text-text-dim hover:text-text'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-danger" />
                    Token Surge
                  </div>
                  <div className="text-[10px] text-muted mt-1 leading-tight">High concurrency burst</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScenario('safe')
                    resetDemo()
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    scenario === 'safe'
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border bg-bg/50 text-text-dim hover:text-text'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    Safe Task
                  </div>
                  <div className="text-[10px] text-muted mt-1 leading-tight">Completes under cap</div>
                </button>
              </div>
            </div>

            {/* Cost Cap Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-dim">Killswitch Cost Cap:</span>
                <span className="font-mono font-bold text-accent">${costCap.toFixed(3)} USD</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.030"
                step="0.005"
                value={costCap}
                disabled={vmState === 'RUNNING'}
                onChange={(e) => setCostCap(parseFloat(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted font-mono">
                <span>$0.005 (Strict)</span>
                <span>$0.010 (Demo)</span>
                <span>$0.030 (Relaxed)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              {vmState === 'IDLE' && (
                <button onClick={startSimulation} className="btn-primary flex-1 justify-center py-2.5">
                  <Play className="w-4 h-4" />
                  Start MicroVM & Run Agent
                </button>
              )}

              {vmState === 'RUNNING' && (
                <button
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
                  onClick={handleResumeWithRaisedCap}
                  className="btn-primary flex-1 justify-center py-2.5 bg-success hover:bg-success/90"
                >
                  <Play className="w-4 h-4" />
                  Raise Cap & Resume VM
                </button>
              )}

              {vmState === 'COMPLETED' && (
                <button onClick={startSimulation} className="btn-primary flex-1 justify-center py-2.5">
                  <Play className="w-4 h-4" />
                  Run Again
                </button>
              )}

              <button
                onClick={resetDemo}
                title="Reset Demo"
                className="btn-secondary px-3"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Telemetry Card */}
          <div className="card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-frozen" />
                2. Live Telemetry & MicroVM State
              </h2>
              {/* Dynamic State Badge */}
              {vmState === 'IDLE' && <span className="badge-stopped">STANDBY</span>}
              {vmState === 'CREATING' && <span className="badge-creating animate-pulse">BOOTING</span>}
              {vmState === 'RUNNING' && <span className="badge-running animate-pulse">RUNNING</span>}
              {vmState === 'FROZEN' && <span className="badge-frozen animate-pulse-glow">FROZEN</span>}
              {vmState === 'COMPLETED' && <span className="badge-running">COMPLETED</span>}
            </div>

            {/* Frozen Alert Banner */}
            {vmState === 'FROZEN' && (
              <div className="p-4 rounded-xl bg-frozen/10 border border-frozen/40 animate-pulse-glow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-frozen font-bold text-sm">
                    <Zap className="w-4 h-4" /> KILLSWITCH TRIPPED
                  </div>
                  {tripLatency && (
                    <div className="flex items-center gap-1 text-xs font-mono text-frozen bg-frozen/20 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3" /> {tripLatency}ms latency
                    </div>
                  )}
                </div>
                <p className="text-xs text-text mb-2">
                  <strong>Enforcement:</strong> MicroVM execution frozen via Firecracker hypervisor API. The rogue agent cannot make further API requests or burn cloud resources.
                </p>
                <div className="text-[11px] font-mono text-frozen/90">
                  Cap: ${costCap.toFixed(4)} | Spent: ${cost.toFixed(4)} | Total Tokens: {tokens}
                </div>
              </div>
            )}

            {/* Resource Meters */}
            <div className="space-y-4">
              {/* Cost Meter */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-text-dim">Cost Incurred:</span>
                  <span className="font-mono">
                    <strong className={cost >= costCap ? 'text-frozen' : 'text-text'}>
                      ${cost.toFixed(4)}
                    </strong>{' '}
                    / ${costCap.toFixed(4)}
                  </span>
                </div>
                <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      cost >= costCap ? 'bg-frozen' : costPercentage > 70 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${costPercentage}%` }}
                  />
                </div>
              </div>

              {/* Tokens & Requests */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-bg rounded-lg border border-border">
                  <div className="text-[11px] text-muted uppercase tracking-wider font-mono">Tokens Used</div>
                  <div className="text-lg font-bold font-mono text-text mt-0.5">
                    {tokens.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-bg rounded-lg border border-border">
                  <div className="text-[11px] text-muted uppercase tracking-wider font-mono">Intercepted Calls</div>
                  <div className="text-lg font-bold font-mono text-text mt-0.5">{requests}</div>
                </div>
              </div>

              {/* vCPU & Memory */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-bg rounded-lg border border-border">
                  <div className="flex items-center justify-between text-[11px] text-muted uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> vCPU
                    </span>
                    <span>2 Cores</span>
                  </div>
                  <div className="text-sm font-semibold font-mono text-text mt-1">{cpuUsage}% active</div>
                </div>

                <div className="p-3 bg-bg rounded-lg border border-border">
                  <div className="flex items-center justify-between text-[11px] text-muted uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Memory
                    </span>
                    <span>1024 MB</span>
                  </div>
                  <div className="text-sm font-semibold font-mono text-text mt-1">
                    {vmState === 'IDLE' ? '0 MB' : vmState === 'FROZEN' ? '312 MB (Frozen)' : '312 MB'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Terminal Stream & Defense Architecture (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Simulated Terminal Window */}
          <div className="card p-0 overflow-hidden flex flex-col h-[460px]">
            {/* Terminal Window Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-danger/80" />
                <div className="w-3 h-3 rounded-full bg-warning/80" />
                <div className="w-3 h-3 rounded-full bg-success/80" />
                <span className="ml-2 text-xs font-mono text-muted">
                  firecracker://sandbox-vm-demo (vsock:cid 3:1024)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-dim font-mono">115200 8N1</span>
                {vmState === 'FROZEN' && (
                  <span className="badge-frozen text-[10px] py-0 px-1.5">FROZEN</span>
                )}
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 bg-[#0A0B0F] p-4 font-mono text-xs overflow-y-auto space-y-1.5 relative select-text">
              {logs.map((log) => (
                <div key={log.id} className="leading-relaxed flex items-start gap-2">
                  <span className="text-muted/60 text-[10px] select-none shrink-0 pt-0.5">{log.time}</span>
                  <span
                    className={
                      log.type === 'system'
                        ? 'text-text-dim'
                        : log.type === 'agent'
                        ? 'text-yellow-400'
                        : log.type === 'gateway'
                        ? 'text-indigo-400'
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
              <div ref={terminalEndRef} />

              {/* Frozen Overlay */}
              {vmState === 'FROZEN' && (
                <div className="absolute inset-0 bg-cyan-950/20 backdrop-blur-[1px] border border-cyan-500/30 flex items-center justify-center pointer-events-none">
                  <div className="bg-surface/90 border border-frozen/50 px-6 py-3 rounded-xl shadow-2xl text-center">
                    <div className="text-frozen font-bold text-sm flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4 animate-bounce" />
                      MICROVM FROZEN BY KILLSWITCH
                    </div>
                    <div className="text-xs text-text-dim mt-1 font-mono">
                      Sub-second cost enforcement completed in {tripLatency ?? 47}ms
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Terminal Footer Bar */}
            <div className="px-4 py-2 bg-surface border-t border-border flex items-center justify-between text-xs text-text-dim font-mono shrink-0">
              <div>Proxy: 127.0.0.1:8080 (Encrypted Key Injection)</div>
              <div>State: {vmState}</div>
            </div>
          </div>

          {/* Academic Architecture Explainer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="card p-3.5 space-y-1.5 border-accent/30 bg-accent/5">
              <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                <Shield className="w-4 h-4 shrink-0" />
                1. MicroVM Isolation
              </div>
              <p className="text-[11px] text-text-dim leading-snug">
                Uses Firecracker KVM hardware virtualization. Immune to container breakout; runs a real Linux 5.10 kernel.
              </p>
            </div>

            <div className="card p-3.5 space-y-1.5 border-purple-500/30 bg-purple-500/5">
              <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-xs">
                <Lock className="w-4 h-4 shrink-0" />
                2. Key Gateway Proxy
              </div>
              <p className="text-[11px] text-text-dim leading-snug">
                API keys are AES-256-GCM encrypted and injected by the host proxy. Secrets never enter the VM filesystem.
              </p>
            </div>

            <div className="card p-3.5 space-y-1.5 border-frozen/30 bg-frozen/5">
              <div className="flex items-center gap-1.5 text-frozen font-semibold text-xs">
                <Zap className="w-4 h-4 shrink-0" />
                3. Sub-second Killswitch
              </div>
              <p className="text-[11px] text-text-dim leading-snug">
                Redis Streams monitor cost & loop patterns. Trips Firecracker pause API in &lt;50ms before bill overruns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
