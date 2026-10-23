import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Settings, RefreshCw, Trash2, Cpu, Activity, Clock } from 'lucide-react'
import { api } from '../api/client'
import type { Sandbox, Policy } from '../api/types'
import { XTerminal } from '../components/terminal/XTerminal'
import { MeterBar } from '../components/ui/MeterBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useMeters } from '../hooks/useMeters'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'

export function SandboxDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: sandbox, isLoading: sbLoading } = useQuery({
    queryKey: ['sandbox', id],
    queryFn: () => api.get<Sandbox>(`/sandboxes/${id}`),
    enabled: !!id,
  })

  const { data: policy } = useQuery({
    queryKey: ['policy', sandbox?.policy_id],
    queryFn: () => api.get<Policy>(`/policies/${sandbox?.policy_id}`),
    enabled: !!sandbox?.policy_id,
  })

  const { meters, state, tripInfo } = useMeters(id, sandbox?.state)

  const pauseMut = useMutation({
    mutationFn: () => api.post(`/sandboxes/${id}/pause`),
    onSuccess: () => { toast.success('Sandbox paused'); queryClient.invalidateQueries({queryKey: ['sandbox', id]}) },
    onError: (e: any) => toast.error(e.message),
  })

  const resumeMut = useMutation({
    mutationFn: (newCostCap?: number) => api.post(`/sandboxes/${id}/resume`, { new_max_cost_usd: newCostCap }),
    onSuccess: () => { toast.success('Sandbox resumed'); queryClient.invalidateQueries({queryKey: ['sandbox', id]}) },
    onError: (e: any) => toast.error(e.message),
  })

  const destroyMut = useMutation({
    mutationFn: () => api.delete(`/sandboxes/${id}`),
    onSuccess: () => { toast.success('Sandbox destroyed'); navigate('/dashboard') },
    onError: (e: any) => toast.error(e.message),
  })

  if (sbLoading || !sandbox) return <div className="flex justify-center p-12"><Spinner /></div>

  const isFrozen = state === 'FROZEN'
  const isRunning = state === 'RUNNING'
  
  // Merge live meters with static initial data
  const cost = meters?.cost_usd ?? sandbox.total_cost_usd
  const tokens = meters?.tokens ?? sandbox.total_tokens
  const memMb = meters?.memory_mb ?? 0
  const cpuS = meters?.cpu_seconds ?? 0

  const handleResume = () => {
    // If frozen due to cost cap, prompt to raise cap by $0.50
    if (tripInfo?.reason === 'max_cost_usd' && policy?.max_cost_usd) {
      if (confirm(`Sandbox tripped cost cap. Raise cap to $${(policy.max_cost_usd + 0.5).toFixed(2)} and resume?`)) {
        resumeMut.mutate(policy.max_cost_usd + 0.5)
      }
    } else {
      resumeMut.mutate()
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden bg-bg">
      {/* Sidebar: Meters & Controls */}
      <div className="w-full md:w-80 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-mono font-semibold text-lg text-text truncate pr-2">{sandbox.name}</h2>
            <StatusBadge state={state as any} />
          </div>
          <div className="text-xs text-text-dim font-mono">{id}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Controls */}
          <div className="flex gap-2">
            {isRunning && (
              <button onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending} className="flex-1 btn-secondary justify-center text-warning hover:text-warning hover:border-warning/50">
                <Square className="w-4 h-4" /> Pause
              </button>
            )}
            {isFrozen && (
              <button onClick={handleResume} disabled={resumeMut.isPending} className="flex-1 btn-secondary justify-center text-success hover:text-success hover:border-success/50">
                <Play className="w-4 h-4" /> Resume
              </button>
            )}
            <button onClick={() => { if(confirm('Destroy sandbox?')) destroyMut.mutate() }} disabled={destroyMut.isPending} className="btn-secondary px-3 text-danger hover:text-danger hover:border-danger/50">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Frozen Alert */}
          {isFrozen && tripInfo && (
            <div className="p-4 rounded-lg bg-frozen/10 border border-frozen/30 animate-pulse-glow">
              <div className="flex items-center gap-2 text-frozen font-semibold mb-2">
                <Activity className="w-4 h-4" /> Killswitch Tripped
              </div>
              <div className="text-sm text-text mb-1">Reason: <span className="font-mono">{tripInfo.reason}</span></div>
              {tripInfo.latencyMs && (
                <div className="text-xs text-text-dim flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Latency: {tripInfo.latencyMs.toFixed(1)}ms
                </div>
              )}
            </div>
          )}

          {/* Meters */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Policy Limits</h3>
            <MeterBar 
              label="Cost (USD)" 
              value={cost} 
              max={policy?.max_cost_usd ?? 1.0} 
              color="success" 
            />
            <MeterBar 
              label="Tokens" 
              value={tokens} 
              max={policy?.max_tokens ?? 100_000} 
              color="accent" 
            />
            
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 mt-6">Live Resources</h3>
            <MeterBar 
              label="Memory" 
              value={memMb} 
              max={sandbox.mem_size_mb} 
              unit="MB"
              color="warning" 
            />
            <div className="flex justify-between text-xs text-text-dim py-1 border-b border-border/50">
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU Time</span>
              <span className="font-mono">{cpuS.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between text-xs text-text-dim py-1 border-b border-border/50">
              <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> TPM</span>
              <span className="font-mono">{meters?.tokens_per_minute.toFixed(0) ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Terminal Area */}
      <div className="flex-1 relative bg-bg p-2">
        {(isRunning || isFrozen) ? (
          <XTerminal sandboxId={id!} frozen={isFrozen} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-dim">
            Sandbox is {state.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  )
}
