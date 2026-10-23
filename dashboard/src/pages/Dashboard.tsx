import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Terminal, Settings as SettingsIcon, Play, Server } from 'lucide-react'
import { api } from '../api/client'
import type { Sandbox, Host, Policy } from '../api/types'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'

export function Dashboard() {
  const [isCreating, setIsCreating] = useState(false)
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

  const handleCreateDemo = async () => {
    setIsCreating(true)
    try {
      await api.post('/demo/launch')
      toast.success('Demo sandbox launched')
      refetchSandboxes()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to launch demo')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateSandbox = async () => {
    if (!hosts?.length) {
      toast.error('No active hosts. Please connect a host first.')
      return
    }
    setIsCreating(true)
    try {
      await api.post('/sandboxes', {
        name: `sb-${Math.random().toString(36).slice(2, 8)}`,
        host_id: hosts[0].id,
        policy_id: policies?.[0]?.id, // default policy
        vcpu_count: 2,
        mem_size_mb: 1024
      })
      toast.success('Sandbox created')
      refetchSandboxes()
    } catch (err: any) {
      toast.error(err.message ?? 'Creation failed')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Sandboxes</h1>
          <p className="text-sm text-text-dim">Manage your isolated microVM instances.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleCreateDemo} 
            disabled={isCreating}
            className="btn-secondary"
          >
            <Play className="w-4 h-4 text-frozen" />
            Launch Rogue Demo
          </button>
          <button 
            onClick={handleCreateSandbox}
            disabled={isCreating}
            className="btn-primary"
          >
            {isCreating ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />}
            New Sandbox
          </button>
        </div>
      </div>

      {!hosts?.length && !isLoading && (
        <div className="card p-6 border-warning/30 bg-warning/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Server className="w-8 h-8 text-warning" />
            <div>
              <h3 className="font-semibold">No hosts connected</h3>
              <p className="text-sm text-text-dim">You need a host machine to run sandboxes.</p>
            </div>
          </div>
          <Link to="/settings" className="btn-secondary">Setup Host</Link>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : sandboxes?.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <Terminal className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No sandboxes running</h3>
          <p className="text-text-dim mb-6 max-w-md mx-auto">
            Create a sandbox to run AI agents safely in a Firecracker microVM.
          </p>
          <button onClick={handleCreateSandbox} className="btn-primary">
            Create your first sandbox
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sandboxes?.map((sb: Sandbox) => (
            <Link key={sb.id} to={`/sandbox/${sb.id}`} className="card p-5 hover:border-accent/50 hover:shadow-[0_0_15px_rgba(91,106,240,0.1)] transition-all flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="font-mono text-sm font-medium text-text">{sb.name}</div>
                <StatusBadge state={sb.state} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-text-dim mb-1">Cost</div>
                  <div className="font-mono text-sm">${sb.total_cost_usd.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-xs text-text-dim mb-1">Tokens</div>
                  <div className="font-mono text-sm">{sb.total_tokens.toLocaleString()}</div>
                </div>
              </div>
              {sb.state === 'FROZEN' && (
                <div className="mt-auto pt-3 border-t border-border text-xs text-frozen flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-frozen animate-pulse" />
                  Tripped: {sb.trip_reason}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
