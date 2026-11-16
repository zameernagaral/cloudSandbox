import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Terminal,
  Play,
  Pause,
  Trash2,
  Server,
  X,
  Zap,
  Cpu,
  Layers,
  Shield,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react'
import { api } from '../api/client'
import type { Sandbox, Host } from '../api/types'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'

export function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedCli, setCopiedCli] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  // New Sandbox Form State
  const [newName, setNewName] = useState('')
  const [preset, setPreset] = useState<'standard' | 'high' | 'mini'>('standard')
  const [workloadScenario, setWorkloadScenario] = useState<'loop' | 'burst' | 'safe' | 'idle'>('loop')
  const [capUsd, setCapUsd] = useState<string>('0.01')

  const {
    data: sandboxes,
    refetch: refetchSandboxes,
    isLoading,
  } = useQuery({
    queryKey: ['sandboxes'],
    queryFn: () => api.get<Sandbox[]>('/sandboxes'),
    refetchInterval: 1500,
  })

  const { data: hosts } = useQuery({
    queryKey: ['hosts'],
    queryFn: () => api.get<Host[]>('/hosts'),
  })

  const cliDeployCmd = `./sandboxctl deploy --name cli-demo --policy '{"max_cost_usd": 0.01}' --scenario loop`

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliDeployCmd)
    setCopiedCli(true)
    setTimeout(() => setCopiedCli(false), 2000)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    const vcpu_count = preset === 'high' ? 4 : preset === 'mini' ? 1 : 2
    const mem_size_mb = preset === 'high' ? 2048 : preset === 'mini' ? 512 : 1024
    const parsedCap = parseFloat(capUsd) || 0.01

    try {
      const payload: Record<string, unknown> = {
        name: newName || `agent-vm-${Math.random().toString(36).slice(2, 6)}`,
        host_id: hosts?.[0]?.id ?? 'host-01',
        vcpu_count,
        mem_size_mb,
        max_cost_usd: parsedCap,
      }
      if (workloadScenario !== 'idle') {
        payload.scenario = workloadScenario
      }

      const created = await api.post<Sandbox>('/sandboxes', payload)
      toast.success(`MicroVM "${created.name}" is now RUNNING`)
      setShowCreateModal(false)
      setNewName('')
      await refetchSandboxes()
      if (created?.id) {
        navigate(`/sandbox/${created.id}`)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Could not create sandbox')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRunScenario = async (e: React.MouseEvent, sb: Sandbox, scenario: 'loop' | 'safe') => {
    e.preventDefault()
    e.stopPropagation()
    setBusyId(sb.id)
    try {
      await api.post(`/sandboxes/${sb.id}/run`, { scenario })
      toast.success(`Started "${scenario}" workload on ${sb.name}`)
      await refetchSandboxes()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to start workload')
    } finally {
      setBusyId(null)
    }
  }

  const handlePause = async (e: React.MouseEvent, sb: Sandbox) => {
    e.preventDefault()
    e.stopPropagation()
    setBusyId(sb.id)
    try {
      await api.post(`/sandboxes/${sb.id}/pause`)
      toast.success(`Paused ${sb.name}`)
      await refetchSandboxes()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleResume = async (e: React.MouseEvent, sb: Sandbox) => {
    e.preventDefault()
    e.stopPropagation()
    setBusyId(sb.id)
    try {
      const nextCap = Number(((sb.total_cost_usd || 0.01) + 0.05).toFixed(2))
      await api.post(`/sandboxes/${sb.id}/resume`, { new_max_cost_usd: nextCap })
      toast.success(`Resumed ${sb.name} (new cap: $${nextCap.toFixed(2)})`)
      await refetchSandboxes()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleDestroy = async (e: React.MouseEvent, sb: Sandbox) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Destroy sandbox "${sb.name}" permanently?`)) return
    setBusyId(sb.id)
    try {
      await api.delete(`/sandboxes/${sb.id}`)
      toast.success(`Destroyed ${sb.name}`)
      await queryClient.invalidateQueries({ queryKey: ['sandboxes'] })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const totalCost = sandboxes?.reduce((acc, s) => acc + (s.total_cost_usd || 0), 0) ?? 0
  const runningCount = sandboxes?.filter((s) => s.state === 'RUNNING').length ?? 0
  const frozenCount = sandboxes?.filter((s) => s.state === 'FROZEN').length ?? 0

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-primary">
            MicroVM Fleet Dashboard
          </h1>
          <p className="text-sm sm:text-base text-ink-muted mt-1">
            Create, monitor, and freeze isolated AI agent virtual machines in real time (synced every 1.5s with CLI).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => refetchSandboxes()}
            className="btn-secondary"
            title="Refresh list now"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-base px-5"
          >
            <Plus className="w-4 h-4" />
            New MicroVM Sandbox
          </button>
        </div>
      </div>

      {/* Clear Web + CLI Live Sync Guide Banner */}
      <div className="card p-5 bg-surface-elevated/70 border border-rule-frame space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-ink-primary flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Web Dashboard &amp; CLI Tool Are Live-Synced
            </div>
            <p className="text-sm text-ink-muted">
              Click <strong className="text-ink-primary">New MicroVM Sandbox</strong> above, or run this CLI command in your Mac terminal and watch the new VM appear here automatically:
            </p>
          </div>
          <div className="flex items-center gap-2 bg-bg-base border border-rule-frame rounded-sm px-3 py-2 font-mono text-xs shrink-0 max-w-full overflow-x-auto">
            <code className="text-emerald-300 whitespace-nowrap">{cliDeployCmd}</code>
            <button
              type="button"
              onClick={handleCopyCli}
              className="btn-secondary px-2.5 py-1 min-h-[30px] text-xs shrink-0"
            >
              {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wider font-mono">Total Sandboxes</div>
          <div className="text-3xl font-bold text-ink-primary mt-1">{sandboxes?.length ?? 0}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wider font-mono">Active &amp; Running</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">{runningCount}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wider font-mono">Killswitch Frozen</div>
          <div className="text-3xl font-bold text-cyan-400 mt-1">{frozenCount}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wider font-mono">Total API Spend</div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-1">${totalCost.toFixed(4)}</div>
        </div>
      </div>

      {/* Host Status Notice if zero hosts */}
      {!hosts?.length && !isLoading && (
        <div className="card p-5 border-amber-500/40 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Server className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <h3 className="font-semibold text-base text-ink-primary">No KVM host node registered</h3>
              <p className="text-sm text-ink-muted">Register a KVM node in Settings or run `./sandboxctl host init`.</p>
            </div>
          </div>
          <Link to="/settings" className="btn-secondary">
            Register Host in Settings
          </Link>
        </div>
      )}

      {/* Sandboxes Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : sandboxes?.length === 0 ? (
        <div className="card p-12 text-center border-dashed space-y-4">
          <Terminal className="w-12 h-12 text-ink-muted mx-auto" />
          <h3 className="text-xl font-semibold text-ink-primary">No sandboxes yet</h3>
          <p className="text-ink-muted max-w-md mx-auto text-sm">
            Create a Firecracker microVM to test AI agent isolation and automatic cost limits.
          </p>
          <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary">
            Create Your First Sandbox
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sandboxes?.map((sb: Sandbox) => {
            const isFrozen = sb.state === 'FROZEN'
            const isRunning = sb.state === 'RUNNING'
            const isBusy = busyId === sb.id

            return (
              <div
                key={sb.id}
                className={`card p-5 flex flex-col justify-between transition-all ${
                  isFrozen ? 'border-cyan-500/50 bg-cyan-950/10' : 'hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/sandbox/${sb.id}`}
                          className="font-semibold text-base text-ink-primary hover:underline truncate"
                        >
                          {sb.name}
                        </Link>
                        {sb.is_demo && (
                          <span className="text-xs font-mono font-medium px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-sm shrink-0">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-muted font-mono mt-0.5">{sb.id}</div>
                    </div>
                    <StatusBadge state={sb.state} />
                  </div>

                  {/* Frozen Callout */}
                  {isFrozen && (
                    <div className="mb-4 p-3 rounded-sm bg-cyan-950/50 border border-cyan-500/40 text-xs text-cyan-200">
                      <div className="font-semibold flex items-center gap-1.5 text-cyan-300">
                        <Zap className="w-4 h-4 shrink-0" /> Killswitch Triggered
                      </div>
                      <div className="mt-1 leading-snug">
                        {sb.trip_reason || 'Cost limit reached'}
                        {sb.trip_to_pause_latency_ms ? ` (Paused in ${sb.trip_to_pause_latency_ms.toFixed(1)}ms)` : ''}
                      </div>
                    </div>
                  )}

                  {/* Specs */}
                  <div className="flex items-center gap-4 text-xs text-ink-muted mb-4 pb-3 border-b border-rule-frame font-mono">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-ink-primary" /> {sb.vcpu_count} vCPU
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-ink-primary" /> {sb.mem_size_mb} MB RAM
                    </span>
                  </div>

                  {/* Spend & Tokens */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Money Spent:</span>
                      <span className="font-mono font-semibold text-ink-primary">
                        ${(sb.total_cost_usd || 0).toFixed(4)} USD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Tokens Metered:</span>
                      <span className="font-mono text-ink-primary">
                        {(sb.total_tokens || 0).toLocaleString()} ({sb.total_requests || 0} calls)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clear Direct Actions */}
                <div className="mt-5 pt-4 border-t border-rule-frame space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    {isRunning && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => handleRunScenario(e, sb, 'loop')}
                          className="btn-secondary flex-1 justify-center text-xs px-3 py-2 min-h-[36px] text-amber-300 border-amber-500/35"
                        >
                          <Zap className="w-3.5 h-3.5" /> Run Rogue Loop
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => handlePause(e, sb)}
                          className="btn-secondary justify-center text-xs px-3 py-2 min-h-[36px]"
                          title="Pause MicroVM"
                        >
                          <Pause className="w-3.5 h-3.5" /> Pause
                        </button>
                      </>
                    )}

                    {isFrozen && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={(e) => handleResume(e, sb)}
                        className="btn-secondary flex-1 justify-center text-xs px-3 py-2 min-h-[36px] text-emerald-300 border-emerald-500/40"
                      >
                        <Play className="w-3.5 h-3.5" /> Raise Cap (+$0.05) &amp; Resume
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={(e) => handleDestroy(e, sb)}
                      className="btn-secondary px-2.5 py-2 min-h-[36px] text-red-300 hover:bg-red-500/15"
                      title="Destroy Sandbox"
                      aria-label={`Destroy ${sb.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link
                    to={`/sandbox/${sb.id}`}
                    className="btn-primary w-full justify-between text-xs px-3.5 py-2 min-h-[38px]"
                  >
                    <span>Open Interactive VM Console &amp; Logs</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Sandbox Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg p-6 space-y-5 shadow-2xl relative border-slate-500">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-2 text-ink-muted hover:text-ink-primary rounded-sm hover:bg-surface-elevated"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-display font-bold text-ink-primary flex items-center gap-2">
                <Terminal className="w-5 h-5 text-amber-400" />
                Launch New Firecracker MicroVM
              </h2>
              <p className="text-sm text-ink-muted mt-1">
                Create an isolated virtual machine with an automatic spending limit.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-ink-primary mb-1.5 font-medium">
                  1. Sandbox Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. faculty-eval-agent"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              {/* Resource Presets */}
              <div>
                <label className="block text-sm text-ink-primary mb-1.5 font-medium">
                  2. Virtual Hardware Size
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'mini', label: 'Small', spec: '1 vCPU • 512MB' },
                    { id: 'standard', label: 'Standard', spec: '2 vCPU • 1GB' },
                    { id: 'high', label: 'Large', spec: '4 vCPU • 2GB' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreset(item.id as 'mini' | 'standard' | 'high')}
                      className={`p-3 rounded-sm border text-left transition-all ${
                        preset === item.id
                          ? 'border-ink-primary bg-surface-elevated text-ink-primary'
                          : 'border-rule-frame bg-bg-base/60 text-ink-muted hover:text-ink-primary'
                      }`}
                    >
                      <div className="font-semibold text-sm">{item.label}</div>
                      <div className="text-xs text-ink-muted font-mono mt-1">{item.spec}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-ink-primary mb-1.5 font-medium">
                    3. Spending Limit (USD)
                  </label>
                  <select
                    className="input"
                    value={capUsd}
                    onChange={(e) => setCapUsd(e.target.value)}
                  >
                    <option value="0.01">$0.01 USD (Strict Killswitch Test)</option>
                    <option value="0.05">$0.05 USD (Short Task)</option>
                    <option value="0.50">$0.50 USD (Balanced)</option>
                    <option value="5.00">$5.00 USD (Extended Dev)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-ink-primary mb-1.5 font-medium">
                    4. Initial Test Behavior
                  </label>
                  <select
                    className="input"
                    value={workloadScenario}
                    onChange={(e) => setWorkloadScenario(e.target.value as 'loop' | 'burst' | 'safe' | 'idle')}
                  >
                    <option value="loop">Run Rogue Infinite Loop (Tests Auto-Freeze)</option>
                    <option value="burst">Run Sudden Cost Surge</option>
                    <option value="safe">Run Safe Normal Task</option>
                    <option value="idle">Open Idle Linux Shell Only</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-sm bg-bg-base border border-rule-frame text-xs text-ink-muted flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Your API keys are stored encrypted on the host and never enter the microVM. If spending reaches ${capUsd}, the VM pauses automatically.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="btn-primary px-6">
                  {isCreating ? <Spinner size="sm" /> : <Play className="w-4 h-4" />}
                  Boot MicroVM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
