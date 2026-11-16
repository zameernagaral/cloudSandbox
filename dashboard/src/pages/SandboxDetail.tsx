import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Play,
  Square,
  Trash2,
  Cpu,
  Activity,
  Clock,
  Zap,
  ArrowLeft,
  Terminal,
  CheckCircle2,
  Send,
} from 'lucide-react'
import { api } from '../api/client'
import type { Sandbox, SandboxMeters } from '../api/types'
import { XTerminal } from '../components/terminal/XTerminal'
import { MeterBar } from '../components/ui/MeterBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'

interface LogEntry {
  time: string
  type: string
  text: string
}

interface LogsResponse {
  sandbox_id: string
  sandbox: Sandbox
  policy_max_cost_usd: number
  meters: SandboxMeters
  logs: LogEntry[]
}

export function SandboxDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logContainerRef = useRef<HTMLDivElement>(null)

  const [viewTab, setViewTab] = useState<'logs' | 'pty'>('logs')
  const [shellInput, setShellInput] = useState('')
  const [execBusy, setExecBusy] = useState(false)

  const { data: liveData, isLoading } = useQuery({
    queryKey: ['sandbox-logs', id],
    queryFn: () => api.get<LogsResponse>(`/sandboxes/${id}/logs`),
    enabled: !!id,
    refetchInterval: 900,
  })

  const sandbox = liveData?.sandbox
  const meters = liveData?.meters
  const logs = liveData?.logs ?? []
  const maxCostUsd = liveData?.policy_max_cost_usd ?? 0.01

  useEffect(() => {
    if (viewTab === 'logs' && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs.length, viewTab])

  const pauseMut = useMutation({
    mutationFn: () => api.post(`/sandboxes/${id}/pause`),
    onSuccess: () => {
      toast.success('MicroVM execution paused')
      queryClient.invalidateQueries({ queryKey: ['sandbox-logs', id] })
      queryClient.invalidateQueries({ queryKey: ['sandboxes'] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const resumeMut = useMutation({
    mutationFn: (newCostCap?: number) =>
      api.post(`/sandboxes/${id}/resume`, { new_max_cost_usd: newCostCap }),
    onSuccess: () => {
      toast.success('MicroVM resumed with updated cap')
      queryClient.invalidateQueries({ queryKey: ['sandbox-logs', id] })
      queryClient.invalidateQueries({ queryKey: ['sandboxes'] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const runMut = useMutation({
    mutationFn: (scenario: 'loop' | 'burst' | 'safe') =>
      api.post(`/sandboxes/${id}/run`, { scenario }),
    onSuccess: (_data, scenario) => {
      toast.success(`Started "${scenario}" workload inside microVM`)
      setViewTab('logs')
      queryClient.invalidateQueries({ queryKey: ['sandbox-logs', id] })
      queryClient.invalidateQueries({ queryKey: ['sandboxes'] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const destroyMut = useMutation({
    mutationFn: () => api.delete(`/sandboxes/${id}`),
    onSuccess: () => {
      toast.success('MicroVM destroyed')
      queryClient.invalidateQueries({ queryKey: ['sandboxes'] })
      navigate('/dashboard')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const runShellCommand = async (cmd: string) => {
    if (!cmd.trim() || !id) return
    setExecBusy(true)
    try {
      await api.post(`/sandboxes/${id}/exec`, { command: cmd.trim() })
      setShellInput('')
      await queryClient.invalidateQueries({ queryKey: ['sandbox-logs', id] })
      await queryClient.invalidateQueries({ queryKey: ['sandboxes'] })
    } catch (err: any) {
      toast.error(err.message ?? 'Command failed')
    } finally {
      setExecBusy(false)
    }
  }

  if (isLoading || !sandbox) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const state = sandbox.state
  const isFrozen = state === 'FROZEN'
  const isRunning = state === 'RUNNING'
  const cost = meters?.cost_usd ?? sandbox.total_cost_usd
  const tokens = meters?.tokens ?? sandbox.total_tokens
  const memMb = meters?.memory_mb ?? (isRunning || isFrozen ? 312 : 0)
  const cpuS = meters?.cpu_seconds ?? 1.2

  const handleResume = () => {
    const nextCap = Number((Math.max(cost, maxCostUsd) + 0.05).toFixed(2))
    resumeMut.mutate(nextCap)
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row bg-bg-base">
      {/* Sidebar: Meters & Controls */}
      <aside className="w-full lg:w-96 shrink-0 border-b lg:border-b-0 lg:border-r border-rule-frame bg-surface-bulkhead flex flex-col">
        <div className="p-5 border-b border-rule-frame space-y-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-primary font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Fleet Dashboard
          </Link>

          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display font-bold text-xl text-ink-primary truncate">{sandbox.name}</h1>
            <StatusBadge state={state} />
          </div>
          <div className="text-xs text-ink-muted font-mono">
            VM ID: {id} · {sandbox.vcpu_count} vCPU · {sandbox.mem_size_mb} MB
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Primary Controls */}
          <div className="space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-wider text-ink-muted">
              Machine Controls
            </div>
            <div className="flex gap-2">
              {isRunning && (
                <button
                  type="button"
                  onClick={() => pauseMut.mutate()}
                  disabled={pauseMut.isPending}
                  className="btn-secondary flex-1 justify-center text-amber-300 border-amber-500/40"
                >
                  <Square className="w-4 h-4" /> Pause VM
                </button>
              )}
              {isFrozen && (
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={resumeMut.isPending}
                  className="btn-primary flex-1 justify-center bg-emerald-500 hover:bg-emerald-400 text-bg-base"
                >
                  <Play className="w-4 h-4" /> Raise Cap &amp; Resume
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Destroy sandbox "${sandbox.name}"?`)) destroyMut.mutate()
                }}
                disabled={destroyMut.isPending}
                className="btn-danger px-3.5"
                title="Destroy microVM"
                aria-label="Destroy microVM"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Frozen Killswitch Explanation Banner */}
          {isFrozen && (
            <div className="p-4 rounded-sm bg-cyan-950/60 border border-cyan-500/50 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
                <Zap className="w-4 h-4 shrink-0" /> Killswitch Stopped This VM
              </div>
              <div className="text-sm text-ink-primary leading-snug">
                {sandbox.trip_reason || 'Spending limit reached.'}
              </div>
              {sandbox.trip_to_pause_latency_ms && (
                <div className="text-xs text-cyan-200 flex items-center gap-1.5 font-mono pt-1">
                  <Clock className="w-3.5 h-3.5" /> Freeze Latency: {sandbox.trip_to_pause_latency_ms.toFixed(1)}ms
                </div>
              )}
            </div>
          )}

          {/* Budget & Policy Meters */}
          <div className="space-y-4">
            <h2 className="text-xs font-mono font-semibold text-ink-muted uppercase tracking-wider">
              Spending Limit &amp; Resource Gauges
            </h2>
            <MeterBar
              label="Money Spent (USD)"
              value={cost}
              max={maxCostUsd}
              color="success"
            />
            <MeterBar
              label="Tokens Used"
              value={tokens}
              max={10_000}
              color="accent"
            />
            <MeterBar
              label="Memory (RAM)"
              value={memMb}
              max={sandbox.mem_size_mb}
              unit="MB"
              color="warning"
            />

            <div className="flex justify-between text-sm text-ink-muted py-1.5 border-b border-rule-frame">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-ink-primary" /> CPU Time
              </span>
              <span className="font-mono text-ink-primary font-medium">{cpuS.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between text-sm text-ink-muted py-1.5 border-b border-rule-frame">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" /> API Calls
              </span>
              <span className="font-mono text-ink-primary font-medium">{sandbox.total_requests} calls</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Console Area */}
      <div className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 space-y-4">
        {/* User-Friendly Quick Actions & Workload Toolbar */}
        <div className="card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                Run Tests or Linux Commands Inside This MicroVM
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Start a simulated AI agent workload to test the killswitch, or run inspect commands inside the guest VM.
              </p>
            </div>

            {/* Tab toggle between Clean Log Stream and Xterm */}
            <div className="flex border border-rule-frame rounded-sm overflow-hidden text-xs font-mono">
              <button
                type="button"
                onClick={() => setViewTab('logs')}
                className={`px-3 py-1.5 ${
                  viewTab === 'logs'
                    ? 'bg-ink-primary text-bg-base font-semibold'
                    : 'bg-bg-base text-ink-muted hover:text-ink-primary'
                }`}
              >
                Live Log Stream
              </button>
              <button
                type="button"
                onClick={() => setViewTab('pty')}
                className={`px-3 py-1.5 ${
                  viewTab === 'pty'
                    ? 'bg-ink-primary text-bg-base font-semibold'
                    : 'bg-bg-base text-ink-muted hover:text-ink-primary'
                }`}
              >
                Interactive Shell
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={!isRunning || runMut.isPending}
              onClick={() => runMut.mutate('loop')}
              className="btn-secondary text-xs px-3 py-1.5 min-h-[34px] text-amber-300 border-amber-500/40"
            >
              <Zap className="w-3.5 h-3.5" /> Run Rogue Loop
            </button>
            <button
              type="button"
              disabled={!isRunning || runMut.isPending}
              onClick={() => runMut.mutate('burst')}
              className="btn-secondary text-xs px-3 py-1.5 min-h-[34px] text-red-300 border-red-500/40"
            >
              <Activity className="w-3.5 h-3.5" /> Run Cost Surge
            </button>
            <button
              type="button"
              disabled={!isRunning || runMut.isPending}
              onClick={() => runMut.mutate('safe')}
              className="btn-secondary text-xs px-3 py-1.5 min-h-[34px] text-emerald-300 border-emerald-500/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Run Safe Task
            </button>

            <span className="hidden sm:inline text-rule-frame mx-1">|</span>

            {['status', 'ps aux', 'cat rogue_agent.py', 'uname -a', 'help'].map((cmd) => (
              <button
                key={cmd}
                type="button"
                disabled={execBusy}
                onClick={() => {
                  setViewTab('logs')
                  runShellCommand(cmd)
                }}
                className="px-2.5 py-1.5 rounded-sm bg-bg-base border border-rule-frame text-xs font-mono text-ink-muted hover:text-ink-primary hover:border-slate-400"
              >
                $ {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal Viewport */}
        <div className="flex-1 min-h-[420px] card p-0 overflow-hidden flex flex-col bg-[#0A0B0F]">
          {viewTab === 'logs' ? (
            <>
              <div
                ref={logContainerRef}
                className="flex-1 p-4 font-mono text-sm overflow-y-auto space-y-2 max-h-[540px]"
              >
                {logs.map((log, i) => (
                  <div key={i} className="leading-relaxed flex items-start gap-2.5">
                    <span className="text-ink-muted text-xs shrink-0 pt-0.5 select-none">{log.time}</span>
                    <span
                      className={
                        log.type === 'cmd'
                          ? 'text-emerald-300 font-bold'
                          : log.type === 'gateway'
                          ? 'text-cyan-300'
                          : log.type === 'warning'
                          ? 'text-amber-300 font-semibold'
                          : log.type === 'killswitch'
                          ? 'text-cyan-300 font-bold'
                          : log.type === 'success'
                          ? 'text-emerald-300 font-semibold'
                          : log.type === 'agent'
                          ? 'text-slate-100'
                          : 'text-ink-muted'
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Command Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  runShellCommand(shellInput)
                }}
                className="p-3 bg-surface-bulkhead border-t border-rule-frame flex gap-2"
              >
                <div className="flex items-center px-2 font-mono text-sm text-emerald-400 shrink-0">
                  root@microvm:~#
                </div>
                <input
                  type="text"
                  value={shellInput}
                  onChange={(e) => setShellInput(e.target.value)}
                  placeholder="Type a command (e.g. status, ps aux, cat rogue_agent.py, help)..."
                  className="input flex-1 font-mono"
                />
                <button type="submit" disabled={execBusy || !shellInput.trim()} className="btn-primary px-4">
                  <Send className="w-4 h-4" /> Run
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 min-h-[460px] p-2">
              <XTerminal sandboxId={id!} frozen={isFrozen} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
