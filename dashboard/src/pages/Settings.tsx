import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Server, Terminal, Shield, Plus, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import type { ApiKey, LLMCredential, Host } from '../api/types'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'

export function Settings() {
  const queryClient = useQueryClient()
  
  // LLM Credentials
  const { data: llmCreds, isLoading: llmLoading } = useQuery({
    queryKey: ['llm-credentials'],
    queryFn: () => api.get<LLMCredential[]>('/settings/llm-credentials')
  })
  const [provider, setProvider] = useState('openai')
  const [llmKey, setLlmKey] = useState('')
  const saveLlmMut = useMutation({
    mutationFn: () => api.put('/settings/llm-credentials', { provider, api_key: llmKey }),
    onSuccess: () => { toast.success('Saved'); setLlmKey(''); queryClient.invalidateQueries({queryKey: ['llm-credentials']}) },
    onError: (e: Error) => toast.error(e.message)
  })

  // API Keys
  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get<ApiKey[]>('/settings/api-keys')
  })
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const createKeyMut = useMutation({
    mutationFn: () => api.post<ApiKey>('/settings/api-keys', { name: keyName }),
    onSuccess: (data: ApiKey) => { setNewKey(data.raw_key!); setKeyName(''); queryClient.invalidateQueries({queryKey: ['api-keys']}) },
    onError: (e: Error) => toast.error(e.message)
  })
  const revokeKeyMut = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/api-keys/${id}`),
    onSuccess: () => { toast.success('Revoked'); queryClient.invalidateQueries({queryKey: ['api-keys']}) }
  })

  // Hosts
  const { data: hosts, isLoading: hostsLoading } = useQuery({
    queryKey: ['hosts'],
    queryFn: () => api.get<Host[]>('/hosts')
  })

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12">
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-text-dim">Manage your API keys, credentials, and infrastructure.</p>
      </div>

      {/* LLM Credentials */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">LLM Credentials</h2>
        </div>
        <p className="text-sm text-text-dim max-w-2xl">
          Encrypted at rest using AES-256-GCM. These are securely injected by the metering gateway on the host machine and are never exposed to the sandbox VM.
        </p>
        <div className="card p-6">
          <div className="flex gap-4 items-end mb-6">
            <div className="w-48">
              <label className="block text-xs text-text-dim mb-1.5">Provider</label>
              <select className="input" value={provider} onChange={e => setProvider(e.target.value)}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-dim mb-1.5">API Key</label>
              <input type="password" placeholder="sk-..." className="input" value={llmKey} onChange={e => setLlmKey(e.target.value)} />
            </div>
            <button onClick={() => saveLlmMut.mutate()} disabled={!llmKey || saveLlmMut.isPending} className="btn-primary">
              {saveLlmMut.isPending ? <Spinner size="sm" /> : 'Save'}
            </button>
          </div>
          
          <div className="space-y-3">
            {llmLoading ? <Spinner size="sm" /> : llmCreds?.map((c: LLMCredential) => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-bg rounded-lg border border-border">
                <span className="capitalize font-medium">{c.provider}</span>
                <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">Configured</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Keys */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">API Keys</h2>
        </div>
        <p className="text-sm text-text-dim max-w-2xl">
          Use these keys to authenticate the <code className="text-accent bg-accent/10 px-1 rounded">sandboxctl</code> CLI.
        </p>
        <div className="card p-6">
          <div className="flex gap-4 items-end mb-6">
            <div className="flex-1">
              <label className="block text-xs text-text-dim mb-1.5">Key Name</label>
              <input type="text" placeholder="e.g. MacBook Pro CLI" className="input" value={keyName} onChange={e => setKeyName(e.target.value)} />
            </div>
            <button onClick={() => createKeyMut.mutate()} disabled={!keyName || createKeyMut.isPending} className="btn-primary">
              {createKeyMut.isPending ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />} Create Key
            </button>
          </div>

          {newKey && (
            <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg">
              <div className="text-sm text-success mb-2 font-medium">New key created! Copy it now, you won't be able to see it again.</div>
              <code className="block p-3 bg-bg rounded font-mono text-sm break-all">{newKey}</code>
            </div>
          )}

          <div className="space-y-3">
            {keysLoading ? <Spinner size="sm" /> : apiKeys?.map((k: ApiKey) => (
              <div key={k.id} className="flex justify-between items-center p-3 bg-bg rounded-lg border border-border">
                <div>
                  <div className="font-medium">{k.name}</div>
                  <div className="text-xs text-text-dim font-mono">{k.key_prefix}...</div>
                </div>
                <button onClick={() => { if(confirm('Revoke key?')) revokeKeyMut.mutate(k.id) }} className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hosts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">Connected Hosts</h2>
        </div>
        <div className="card p-6">
          <div className="space-y-3">
            {hostsLoading ? <Spinner size="sm" /> : hosts?.map((h: Host) => (
              <div key={h.id} className="flex justify-between items-center p-4 bg-bg rounded-lg border border-border">
                <div>
                  <div className="font-medium mb-1">{h.name}</div>
                  <div className="text-xs text-text-dim font-mono">{h.agent_url}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{h.total_vcpu} vCPU • {Math.round(h.total_ram_mb/1024)}GB RAM</div>
                  <div className="text-xs text-success mt-1">Active</div>
                </div>
              </div>
            ))}
            {hosts?.length === 0 && (
              <div className="text-center py-6 text-text-dim">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No hosts connected. Run <code className="text-accent bg-accent/10 px-1 rounded">sandboxctl host init</code>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
