import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  ExternalLink,
  HelpCircle,
} from 'lucide-react'
import { api } from '../../api/client'
import type { Sandbox, SandboxMeters } from '../../api/types'
import { useAuthStore, DEFAULT_LIVE_DEMO_KEY } from '../../store/auth'

type Scenario = 'loop' | 'burst' | 'safe'
type VMState = 'IDLE' | 'CREATING' | 'RUNNING' | 'FROZEN' | 'COMPLETED'

interface LogEntry {
  id?: number
  text: string
  type: 'system' | 'agent' | 'gateway' | 'warning' | 'killswitch' | 'success' | 'cmd'
  time: string
}

export function InteractiveSimulator() {
  const navigate = useNavigate()
  const { user, loginAsDemo } = useAuthStore()

  const [scenario, setScenario] = useState<Scenario>('loop')
  const [costCap, setCostCap] = useState<number>(0.01)
  const [vmState, setVmState] = useState<VMState>('IDLE')
  const [cost, setCost] = useState<number>(0)
  const [tokens, setTokens] = useState<number>(0)
  const [requests, setRequests] = useState<number>(0)
  const [cpuUsage, setCpuUsage] = useState<number>(0)
  const [tripLatency, setTripLatency] = useState<number | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [liveSandboxId, setLiveSandboxId] = useState<string | null>(null)
  const [syncedBackend, setSyncedBackend] = useState<boolean>(false)

  const terminalBodyRef = useRef<HTMLDivElement>(null)
  const localTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight
    }
  }, [logs])

  const stopAllTimers = () => {
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current)
      localTimerRef.current = null
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  const addLocalLog = (text: string, type: LogEntry['type'] = 'system') => {
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

  const resetDemo = () => {
    stopAllTimers()
    setVmState('IDLE')
    setCost(0)
    setTokens(0)
    setRequests(0)
    setCpuUsage(0)
    setTripLatency(null)
    setLiveSandboxId(null)
    setSyncedBackend(false)
    setLogs([
      {
        id: 1,
        text: 'Cloud Sandbox MicroVM Simulator ready.',
        type: 'system',
        time: '00:00:00.000',
      },
      {
        id: 2,
        text: 'Follow Steps 1–3 on the left, then click "Start MicroVM & Run Agent".',
        type: 'system',
        time: '00:00:00.001',
      },
    ])
  }

  useEffect(() => {
    resetDemo()
    return () => stopAllTimers()
  }, [])

  const startLocalFallbackSimulation = (activeScenario: Scenario, cap: number) => {
    addLocalLog('[OFFLINE FALLBACK] Running in browser simulator mode (backend port 8000 unreachable).', 'system')
    addLocalLog('[FIRECRACKER] MicroVM booted in 118ms (2 vCPU, 1024 MB RAM).', 'system')
    setVmState('RUNNING')
    setCpuUsage(45)

    let currentCost = 0
    let currentTokens = 0
    let reqCount = 0

    localTimerRef.current = setInterval(() => {
      reqCount += activeScenario === 'burst' ? 2 : 1
      const addedTokens = activeScenario === 'burst' ? 1150 : activeScenario === 'safe' ? 220 : 395
      const addedCost =
        activeScenario === 'burst'
          ? Math.max(0.0045, Number((cap * 0.48).toFixed(4)))
          : activeScenario === 'safe'
          ? 0.0012
          : Math.max(0.0028, Number((cap / 3.5).toFixed(4)))

      currentTokens += addedTokens
      currentCost = Number((currentCost + addedCost).toFixed(4))

      setRequests(reqCount)
      setTokens(currentTokens)
      setCost(currentCost)
      setCpuUsage(activeScenario === 'safe' ? 35 : 82)

      addLocalLog(`[AGENT] Calling LLM API [request #${reqCount}]`, 'agent')
      addLocalLog(`[GATEWAY] Metered +${addedTokens} tokens (Total cost: $${currentCost.toFixed(4)} / $${cap.toFixed(4)})`, 'gateway')

      if (activeScenario !== 'safe' && currentCost >= cap) {
        stopAllTimers()
        setTripLatency(42)
        setVmState('FROZEN')
        setCpuUsage(0)
        addLocalLog(`⚡ [KILLSWITCH TRIPPED] Budget limit reached ($${currentCost.toFixed(4)} >= $${cap.toFixed(4)})`, 'killswitch')
        addLocalLog(`🔒 [ENFORCEMENT] MicroVM frozen in 42ms — billing stopped safely.`, 'killswitch')
      } else if (activeScenario === 'safe' && reqCount >= 3) {
        stopAllTimers()
        setVmState('COMPLETED')
        setCpuUsage(0)
        addLocalLog(`✅ [SUCCESS] Task completed safely under budget ($${currentCost.toFixed(4)}).`, 'success')
      }
    }, 950)
  }

  const startSimulation = async () => {
    stopAllTimers()
    setVmState('CREATING')
    setCost(0)
    setTokens(0)
    setRequests(0)
    setCpuUsage(15)
    setTripLatency(null)
    setLogs([])

    if (!localStorage.getItem('access_token')) {
      localStorage.setItem('access_token', DEFAULT_LIVE_DEMO_KEY)
    }

    try {
      const sb = await api.post<Sandbox>(
        `/demo/launch?scenario=${scenario}&cost_cap_usd=${costCap}`,
      )

      // Distinguish real SQLite sandbox IDs (sb-xxxxxxxx) from offline mock fallback
      if (!sb?.id) {
        startLocalFallbackSimulation(scenario, costCap)
        return
      }

      setLiveSandboxId(sb.id)
      setSyncedBackend(true)
      setVmState('RUNNING')

      // Poll live logs & telemetry from Control Plane every 800ms
      const pollOnce = async () => {
        try {
          const data = await api.get<{
            sandbox: Sandbox
            meters: SandboxMeters
            logs: LogEntry[]
          }>(`/sandboxes/${sb.id}/logs`)

          if (data?.logs?.some((l) => l.text.includes('OFFLINE FALLBACK'))) {
            stopAllTimers()
            startLocalFallbackSimulation(scenario, costCap)
            return
          }

          if (data?.logs) {
            setLogs(data.logs)
          }
          if (data?.sandbox) {
            setCost(data.sandbox.total_cost_usd)
            setTokens(data.sandbox.total_tokens)
            setRequests(data.sandbox.total_requests)
            if (data.sandbox.state === 'FROZEN') {
              setVmState('FROZEN')
              setCpuUsage(0)
              setTripLatency(data.sandbox.trip_to_pause_latency_ms ?? 42)
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current)
                pollTimerRef.current = null
              }
            } else if (data.sandbox.state === 'RUNNING') {
              setCpuUsage(scenario === 'safe' ? 35 : 78)
              if (
                scenario === 'safe' &&
                data.logs?.some((l) => l.text.includes('[SUCCESS]'))
              ) {
                setVmState('COMPLETED')
                setCpuUsage(0)
                if (pollTimerRef.current) {
                  clearInterval(pollTimerRef.current)
                  pollTimerRef.current = null
                }
              }
            }
          }
        } catch {
          // Ignore transient poll errors
        }
      }

      await pollOnce()
      pollTimerRef.current = setInterval(pollOnce, 800)
    } catch {
      startLocalFallbackSimulation(scenario, costCap)
    }
  }

  const handleManualPause = async () => {
    stopAllTimers()
    if (liveSandboxId && syncedBackend) {
      await api.post(`/sandboxes/${liveSandboxId}/pause`).catch(() => {})
    }
    setVmState('FROZEN')
    setCpuUsage(0)
    setTripLatency(40)
    addLocalLog('⚡ [MANUAL STOP] Operator froze the microVM immediately.', 'killswitch')
  }

  const handleResumeWithRaisedCap = async () => {
    const newCap = Number((costCap + 0.02).toFixed(2))
    setCostCap(newCap)
    setTripLatency(null)

    if (liveSandboxId && syncedBackend) {
      await api.post(`/sandboxes/${liveSandboxId}/resume`, { new_max_cost_usd: newCap }).catch(() => {})
      await api.post(`/sandboxes/${liveSandboxId}/run`, { scenario, max_cost_usd: newCap }).catch(() => {})
      setVmState('RUNNING')
      pollTimerRef.current = setInterval(async () => {
        const data = await api.get<{ sandbox: Sandbox; logs: LogEntry[] }>(`/sandboxes/${liveSandboxId}/logs`).catch(() => null)
        if (!data) return
        setLogs(data.logs)
        setCost(data.sandbox.total_cost_usd)
        setTokens(data.sandbox.total_tokens)
        setRequests(data.sandbox.total_requests)
        if (data.sandbox.state === 'FROZEN') {
          setVmState('FROZEN')
          setCpuUsage(0)
          setTripLatency(data.sandbox.trip_to_pause_latency_ms ?? 42)
          stopAllTimers()
        }
      }, 800)
    } else {
      startLocalFallbackSimulation(scenario, newCap)
    }
  }

  const costPercentage = Math.min(100, (cost / costCap) * 100)

  return (
    <section id="demo" aria-labelledby="demo-heading" className="space-y-6 pt-4">
      {/* Top Showcase Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-rule-frame pb-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-surface-elevated border border-rule-frame text-xs font-mono text-ink-muted">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Interactive Live Evaluation Simulator</span>
          </div>
          <h2 id="demo-heading" className="font-display font-bold text-2xl sm:text-3xl text-ink-primary">
            Test the Cost-Cap Killswitch Live
          </h2>
          <p className="text-base text-ink-muted leading-relaxed">
            See what happens when an AI agent gets stuck in an infinite loop or spends money too fast. As soon as spending reaches your limit below, the host automatically freezes the virtual machine.
          </p>
        </div>

        {/* 3-Col Benchmark Pill Box */}
        <div className="grid grid-cols-3 divide-x divide-rule-frame bg-surface-bulkhead border border-rule-frame rounded-md text-xs font-mono shrink-0">
          <div className="px-4 py-3">
            <div className="text-ink-muted uppercase tracking-wider">ISOLATION</div>
            <div className="font-semibold text-ink-primary mt-1">Firecracker v1.7</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-ink-muted uppercase tracking-wider">KERNEL</div>
            <div className="font-semibold text-ink-primary mt-1">Linux 5.10</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-ink-muted uppercase tracking-wider">FREEZE SPEED</div>
            <div className="font-semibold text-emerald-300 mt-1">&lt; 50 ms</div>
          </div>
        </div>
      </div>

      {/* Clear 3-Step User Guide Banner */}
      <div className="p-4 rounded-md bg-surface-elevated/80 border border-rule-frame flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 md:mt-0" />
          <div className="text-sm text-ink-primary">
            <span className="font-semibold">Quick Guide: </span>
            <span className="text-ink-muted">
              <strong className="text-ink-primary">1.</strong> Choose a scenario ·{' '}
              <strong className="text-ink-primary">2.</strong> Set budget cap ·{' '}
              <strong className="text-ink-primary">3.</strong> Click Start and watch the terminal auto-freeze!
            </span>
          </div>
        </div>
        {liveSandboxId && (
          <button
            type="button"
            onClick={() => {
              if (!user) loginAsDemo()
              navigate(`/sandbox/${liveSandboxId}`)
            }}
            className="btn-secondary text-xs shrink-0 border-emerald-500/40 text-emerald-300"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Inspect Live Sandbox ({liveSandboxId})
          </button>
        )}
      </div>

      {/* Main 12-Column Interactive Grid (Calmly Docked — No Scroll Flying) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scenario & Live Telemetry (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Configure Agent Scenario */}
          <div className="card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-ink-primary flex items-center gap-2">
                <Sliders className="w-4 h-4 text-ink-muted" />
                Step 1 &amp; 2: Configure Agent Test
              </h3>
              <span className="text-xs font-mono text-ink-muted">Safe Demo Policy</span>
            </div>

            {/* Scenario Buttons */}
            <div className="space-y-2">
              <label className="text-sm text-ink-muted font-medium block">Choose how the AI agent behaves:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setScenario('loop')
                    resetDemo()
                  }}
                  className={`p-3 rounded-sm border text-left transition-all ${
                    scenario === 'loop'
                      ? 'border-ink-primary bg-surface-elevated text-ink-primary'
                      : 'border-rule-frame bg-bg-base/60 text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    Infinite Loop
                  </div>
                  <div className="text-xs text-ink-muted mt-1 leading-snug">Agent keeps repeating same error</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScenario('burst')
                    resetDemo()
                  }}
                  className={`p-3 rounded-sm border text-left transition-all ${
                    scenario === 'burst'
                      ? 'border-ink-primary bg-surface-elevated text-ink-primary'
                      : 'border-rule-frame bg-bg-base/60 text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    Cost Spike
                  </div>
                  <div className="text-xs text-ink-muted mt-1 leading-snug">Sudden heavy API spending burst</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScenario('safe')
                    resetDemo()
                  }}
                  className={`p-3 rounded-sm border text-left transition-all ${
                    scenario === 'safe'
                      ? 'border-ink-primary bg-surface-elevated text-ink-primary'
                      : 'border-rule-frame bg-bg-base/60 text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Normal Task
                  </div>
                  <div className="text-xs text-ink-muted mt-1 leading-snug">Finishes safely within budget</div>
                </button>
              </div>
            </div>

            {/* Cost Cap Slider */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted font-medium">Maximum Budget Allowed:</span>
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
                className="w-full h-2 accent-ink-primary cursor-pointer"
              />
              <div className="flex justify-between text-xs text-ink-muted font-mono">
                <span>$0.005 (Strict)</span>
                <span>$0.010 (Recommended)</span>
                <span>$0.030 (High)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              {vmState === 'IDLE' && (
                <button
                  type="button"
                  onClick={startSimulation}
                  className="btn-primary flex-1 justify-center text-base"
                >
                  <Play className="w-4 h-4" />
                  Step 3: Start MicroVM &amp; Run Agent
                </button>
              )}

              {vmState === 'CREATING' && (
                <button type="button" disabled className="btn-primary flex-1 justify-center text-base">
                  Booting Firecracker MicroVM...
                </button>
              )}

              {vmState === 'RUNNING' && (
                <button
                  type="button"
                  onClick={handleManualPause}
                  className="btn-danger flex-1 justify-center text-base"
                >
                  <Pause className="w-4 h-4" />
                  Emergency Stop (Freeze Now)
                </button>
              )}

              {vmState === 'FROZEN' && (
                <button
                  type="button"
                  onClick={handleResumeWithRaisedCap}
                  className="btn-primary flex-1 justify-center bg-emerald-500 hover:bg-emerald-400 text-bg-base text-base"
                >
                  <Play className="w-4 h-4" />
                  Raise Limit (+$0.02) &amp; Resume
                </button>
              )}

              {vmState === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={startSimulation}
                  className="btn-primary flex-1 justify-center text-base"
                >
                  <Play className="w-4 h-4" />
                  Run Test Again
                </button>
              )}

              <button
                type="button"
                onClick={resetDemo}
                title="Reset Demo"
                aria-label="Reset Demo"
                className="btn-secondary px-3.5"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Live Telemetry & MicroVM State */}
          <div className="card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-ink-primary flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live Spending &amp; Machine Status
              </h3>
              {vmState === 'IDLE' && <span className="badge-stopped">READY</span>}
              {vmState === 'CREATING' && <span className="badge-creating animate-pulse">BOOTING</span>}
              {vmState === 'RUNNING' && <span className="badge-running animate-pulse">RUNNING</span>}
              {vmState === 'FROZEN' && <span className="badge-frozen">FROZEN (STOPPED)</span>}
              {vmState === 'COMPLETED' && <span className="badge-running">COMPLETED</span>}
            </div>

            <div className="space-y-4">
              {/* Cost Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-ink-muted">Money Spent vs Limit:</span>
                  <span className="font-bold text-ink-primary">
                    ${cost.toFixed(4)} / ${costCap.toFixed(4)}
                  </span>
                </div>
                <div className="w-full h-3 bg-bg-base rounded-full overflow-hidden border border-rule-frame">
                  <div
                    className={`h-full transition-all duration-300 ${
                      costPercentage >= 100
                        ? 'bg-red-500'
                        : costPercentage >= 75
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${costPercentage}%` }}
                  />
                </div>
              </div>

              {/* Tokens & Calls */}
              <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                <div className="p-3 bg-bg-base rounded-sm border border-rule-frame">
                  <div className="text-xs text-ink-muted uppercase tracking-wider">TOKENS USED</div>
                  <div className="text-xl font-bold text-ink-primary mt-1">{tokens.toLocaleString()}</div>
                </div>

                <div className="p-3 bg-bg-base rounded-sm border border-rule-frame">
                  <div className="text-xs text-ink-muted uppercase tracking-wider">API CALLS</div>
                  <div className="text-xl font-bold text-ink-primary mt-1">{requests}</div>
                </div>
              </div>

              {/* vCPU & Memory */}
              <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                <div className="p-3 bg-bg-base rounded-sm border border-rule-frame">
                  <div className="flex items-center justify-between text-xs text-ink-muted uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" /> CPU LOAD
                    </span>
                    <span>2 CORES</span>
                  </div>
                  <div className="text-sm font-semibold text-ink-primary mt-1">{cpuUsage}% active</div>
                </div>

                <div className="p-3 bg-bg-base rounded-sm border border-rule-frame">
                  <div className="flex items-center justify-between text-xs text-ink-muted uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> MEMORY
                    </span>
                    <span>1024 MB</span>
                  </div>
                  <div className="text-sm font-semibold text-ink-primary mt-1">
                    {vmState === 'IDLE' ? '0 MB' : vmState === 'FROZEN' ? '312 MB (Paused)' : '312 MB'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Docked Terminal & 3 Plain-English Explainer Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="w-full h-[470px]">
            <div
              id="hero-interactive-chamber"
              className="w-full h-full card p-0 overflow-hidden flex flex-col bg-bg-base border border-rule-frame rounded-md shadow-bulkhead"
            >
              {/* Terminal Window Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-rule-frame bg-surface-bulkhead shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full bg-signal-breach/80 shrink-0" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80 shrink-0" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80 shrink-0" />
                  <span className="ml-2 text-xs font-mono text-ink-primary truncate">
                    Live Virtual Machine Output ({liveSandboxId || 'sandbox-demo'})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-ink-muted font-mono hidden sm:inline">
                    {syncedBackend ? '● Live API Sync' : 'Simulator'}
                  </span>
                  {vmState === 'FROZEN' && (
                    <span className="badge-frozen py-0.5 px-2">FROZEN</span>
                  )}
                </div>
              </div>

              {/* Terminal Body */}
              <div ref={terminalBodyRef} className="flex-1 bg-[#0A0B0F] p-4 font-mono text-sm overflow-y-auto space-y-2 relative select-text">
                {logs.map((log, idx) => (
                  <div key={log.id ?? idx} className="leading-relaxed flex items-start gap-2.5">
                    <span className="text-ink-muted text-xs select-none shrink-0 pt-0.5">{log.time}</span>
                    <span
                      className={
                        log.type === 'system'
                          ? 'text-ink-muted'
                          : log.type === 'agent'
                          ? 'text-slate-100'
                          : log.type === 'gateway'
                          ? 'text-cyan-300'
                          : log.type === 'warning'
                          ? 'text-amber-300 font-semibold'
                          : log.type === 'killswitch'
                          ? 'text-cyan-300 font-bold'
                          : 'text-emerald-300 font-semibold'
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))}

                {/* Frozen Overlay */}
                {vmState === 'FROZEN' && (
                  <div className="mt-4 p-4 rounded-md bg-cyan-950/60 border border-cyan-400/50 text-center">
                    <div className="text-cyan-300 font-bold text-base flex items-center justify-center gap-2 font-mono">
                      <Zap className="w-4 h-4" />
                      MICROVM FROZEN BY KILLSWITCH
                    </div>
                    <div className="text-sm text-ink-primary mt-1 font-sans">
                      Execution halted automatically in {tripLatency ?? 42}ms. Your host machine and budget are protected.
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal Footer Bar */}
              <div className="px-4 py-2.5 bg-surface-bulkhead border-t border-rule-frame flex items-center justify-between text-xs text-ink-muted font-mono shrink-0">
                <span>Key Security: API keys held safely outside VM</span>
                <span>State: {vmState}</span>
              </div>
            </div>
          </div>

          {/* 3 Clear Plain-English Architecture Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 space-y-2">
              <div className="flex items-center gap-2 text-ink-primary font-semibold text-sm">
                <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
                1. Full Isolation
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Runs code in its own private microVM with its own Linux kernel—so buggy AI code can never harm your server.
              </p>
            </div>

            <div className="card p-4 space-y-2">
              <div className="flex items-center gap-2 text-ink-primary font-semibold text-sm">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                2. Hidden API Keys
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Secret OpenAI/Anthropic keys stay encrypted outside the VM. The AI agent can make calls without ever seeing your password.
              </p>
            </div>

            <div className="card p-4 space-y-2">
              <div className="flex items-center gap-2 text-ink-primary font-semibold text-sm">
                <Zap className="w-4 h-4 shrink-0 text-cyan-400" />
                3. Auto Killswitch
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Every request is metered in real time. If costs hit the limit or a loop repeats, the VM pauses in under 50ms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
