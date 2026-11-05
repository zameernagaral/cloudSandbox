import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Terminal,
  Play,
  Server,
  X,
  Zap,
  Activity,
  Cpu,
  Layers,
  Shield,
  ArrowRight,
} from 'lucide-react'
import { api } from '../api/client'
import type { Sandbox, Host, Policy } from '../api/types'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'

export function Dashboard() {
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // New Sandbox Form State
  const [newName, setNewName] = useState('')
  const [preset, setPreset] = useState<'standard' | 'high' | 'mini'>('standard')
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('')

  const { data: sandboxes, refetch: refetchSandboxes, isLoading } = useQuery({
    queryKey: ['sandboxes'],
    queryFn: () => api.get<Sandbox[]>('/sandboxes'),
  })

  const { data: hosts } = useQuery({
    queryKey: ['hosts'],
    queryFn: () => api.get<Host[]>('/hosts'),
  })

  const { data: policies } = useQuery({
    queryKey: ['policies'],
    queryFn: () => api.get<Policy[]>('/policies'),
  })

  const handleLaunchRogueDemo = () => {
    navigate('/demo')
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    const vcpu_count = preset === 'high' ? 4 : preset === 'mini' ? 1 : 2
    const mem_size_mb = preset === 'high' ? 2048 : preset === 'mini' ? 512 : 1024

    try {
      const created = await api.post<Sandbox>('/sandboxes', {
        name: newName || `sb-${Math.random().toString(36).slice(2, 8)}`,
        host_id: hosts?.[0]?.id ?? 'host-01',
        policy_id: selectedPolicyId || policies?.[0]?.id || 'pol-cost-cap',
        vcpu_count,
        mem_size_mb,
      })
      toast.success('Firecracker microVM spawned successfully!')
      setShowCreateModal(false)
      setNewName('')
      await refetchSandboxes()
      if (created?.id) {
        navigate(`/sandbox/${created.id}`)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Sandbox creation failed')
    } finally {
      setIsCreating(false)
    }
  }

  // Summary Metrics
  const totalCost = sandboxes?.reduce((acc, s) => acc + (s.total_cost_usd || 0), 0) ?? 0
  const runningCount = sandboxes?.filter((s) => s.state === 'RUNNING').length ?? 0
  const frozenCount = sandboxes?.filter((s) => s.state === 'FROZEN').length ?? 0

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Sandboxes</h1>
          <p className="text-sm text-text-dim">
            Manage your isolated Firecracker microVM instances and automatic killswitches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLaunchRogueDemo}
            className="btn-secondary text-frozen hover:text-frozen hover:border-frozen/40"
          >
            <Zap className="w-4 h-4 text-frozen" />
            Live Rogue Demo
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            New MicroVM Sandbox
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-[11px] text-muted uppercase tracking-wider font-mono">Total Sandboxes</div>
          <div className="text-2xl font-bold text-text mt-1">{sandboxes?.length ?? 0}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-muted uppercase tracking-wider font-mono">Running VMs</div>
          <div className="text-2xl font-bold text-success mt-1">{runningCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-muted uppercase tracking-wider font-mono">Killswitch Frozen</div>
          <div className="text-2xl font-bold text-frozen mt-1">{frozenCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-muted uppercase tracking-wider font-mono">Cumulative Spend</div>
          <div className="text-2xl font-bold font-mono text-accent mt-1">${totalCost.toFixed(4)}</div>
        </div>
      </div>

      {/* Host Status Check */}
      {!hosts?.length && !isLoading && (
        <div className="card p-6 border-warning/30 bg-warning/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Server className="w-8 h-8 text-warning" />
            <div>
              <h3 className="font-semibold text-sm">No bare-metal KVM host connected</h3>
              <p className="text-xs text-text-dim">You need a host running the Firecracker agent to execute real VMs.</p>
            </div>
          </div>
          <Link to="/settings" className="btn-secondary text-xs">
            Setup Host Agent
          </Link>
        </div>
      )}

      {/* Sandboxes Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : sandboxes?.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <Terminal className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No sandboxes running</h3>
          <p className="text-text-dim mb-6 max-w-md mx-auto text-sm">
            Spawn a Firecracker microVM to run AI coding agents safely with isolated execution and budget caps.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            Create your first sandbox
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sandboxes?.map((sb: Sandbox) => {
            const isFrozen = sb.state === 'FROZEN'
            const isRunning = sb.state === 'RUNNING'

            return (
              <Link
                key={sb.id}
                to={`/sandbox/${sb.id}`}
                className={`card p-5 hover:border-accent/50 hover:shadow-[0_0_20px_rgba(91,106,240,0.12)] transition-all flex flex-col justify-between group ${
                  isFrozen ? 'border-frozen/40 bg-frozen/[0.03]' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-text group-hover:text-accent transition-colors truncate max-w-[170px]">
                          {sb.name}
                        </h3>
                        {sb.is_demo && (
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-accent/15 text-accent rounded">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted font-mono">{sb.id}</div>
                    </div>
                    <StatusBadge state={sb.state as any} />
                  </div>

                  {/* Frozen Callout */}
                  {isFrozen && (
                    <div className="mb-4 p-2.5 rounded-lg bg-frozen/10 border border-frozen/30 text-xs text-frozen">
                      <div className="font-semibold flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> Killswitch Enforced
                      </div>
                      <div className="text-[11px] text-text-dim mt-0.5">
                        {sb.trip_reason || 'Max cost cap exceeded'}
                        {sb.trip_to_pause_latency_ms && ` (${sb.trip_to_pause_latency_ms}ms)`}
                      </div>
                    </div>
                  )}

                  {/* Specs Pill */}
                  <div className="flex items-center gap-3 text-xs text-text-dim mb-4 pb-3 border-b border-border/50 font-mono">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-accent" /> {sb.vcpu_count} vCPU
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-purple-400" /> {sb.mem_size_mb} MB
                    </span>
                  </div>

                  {/* Meter summary */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-dim">Current Spend:</span>
                      <span className="font-mono font-semibold text-text">
                        ${(sb.total_cost_usd || 0).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-dim">Tokens:</span>
                      <span className="font-mono text-text">
                        {(sb.total_tokens || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-text-dim group-hover:text-accent transition-colors">
                  <span>Open VM Console</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create Sandbox Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg p-6 space-y-6 shadow-2xl relative border-accent/30">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 text-muted hover:text-text rounded-lg hover:bg-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-text flex items-center gap-2">
                <Terminal className="w-5 h-5 text-accent" />
                Spawn Firecracker MicroVM
              </h2>
              <p className="text-xs text-text-dim mt-0.5">
                Launch an isolated microVM with hardware virtualization and automatic budget caps.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-dim mb-1.5 font-medium">
                  Sandbox Instance Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. swe-bench-agent-vm"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              {/* Resource Presets */}
              <div>
                <label className="block text-xs text-text-dim mb-1.5 font-medium">
                  Compute Resources (vCPU & RAM)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreset('mini')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      preset === 'mini'
                        ? 'border-accent bg-accent/10 text-text'
                        : 'border-border bg-bg/50 text-text-dim hover:text-text'
                    }`}
                  >
                    <div className="font-semibold text-xs">Minimal</div>
                    <div className="text-[11px] text-muted font-mono mt-1">1 vCPU • 512MB</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreset('standard')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      preset === 'standard'
                        ? 'border-accent bg-accent/10 text-text'
                        : 'border-border bg-bg/50 text-text-dim hover:text-text'
                    }`}
                  >
                    <div className="font-semibold text-xs">Standard</div>
                    <div className="text-[11px] text-muted font-mono mt-1">2 vCPU • 1GB</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreset('high')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      preset === 'high'
                        ? 'border-accent bg-accent/10 text-text'
                        : 'border-border bg-bg/50 text-text-dim hover:text-text'
                    }`}
                  >
                    <div className="font-semibold text-xs">High-Compute</div>
                    <div className="text-[11px] text-muted font-mono mt-1">4 vCPU • 2GB</div>
                  </button>
                </div>
              </div>

              {/* Security Policy Selection */}
              <div>
                <label className="block text-xs text-text-dim mb-1.5 font-medium">
                  Security & Killswitch Policy
                </label>
                <select
                  className="input"
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                >
                  {policies?.map((pol: Policy) => (
                    <option key={pol.id} value={pol.id}>
                      {pol.name} (Cap: ${pol.max_cost_usd?.toFixed(2) ?? '1.00'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-surface border border-border text-xs text-text-dim flex items-start gap-2">
                <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Host LLM Gateway will inject API keys into outgoing requests and trip the microVM killswitch if cost exceeds policy cap.
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
                <button type="submit" disabled={isCreating} className="btn-primary">
                  {isCreating ? <Spinner size="sm" /> : <Play className="w-4 h-4" />}
                  Launch MicroVM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
