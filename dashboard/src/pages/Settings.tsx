import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Server, Terminal, Shield, Plus, Trash2, Copy, Check } from 'lucide-react'
import { api } from '../api/client'
import type { ApiKey, LLMCredential, Host } from '../api/types'
import { Spinner } from '../components/ui/Spinner'
import { DEFAULT_LIVE_DEMO_KEY } from '../store/auth'
import toast from 'react-hot-toast'

export function Settings() {
  const queryClient = useQueryClient()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyText = (id: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // LLM Credentials
  const { data: llmCreds, isLoading: llmLoading } = useQuery({
    queryKey: ['llm-credentials'],
    queryFn: () => api.get<LLMCredential[]>('/settings/llm-credentials'),
  })
  const [provider, setProvider] = useState('openai')
  const [llmKey, setLlmKey] = useState('')
  const saveLlmMut = useMutation({
    mutationFn: () => api.put('/settings/llm-credentials', { provider, api_key: llmKey }),
    onSuccess: () => {
      toast.success('LLM key encrypted & saved')
      setLlmKey('')
      queryClient.invalidateQueries({ queryKey: ['llm-credentials'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // API Keys
  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get<ApiKey[]>('/settings/api-keys'),
  })
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const createKeyMut = useMutation({
    mutationFn: () => api.post<ApiKey>('/settings/api-keys', { name: keyName }),
    onSuccess: (data: ApiKey) => {
      setNewKey(data.raw_key!)
      setKeyName('')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API Key generated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const revokeKeyMut = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/api-keys/${id}`),
    onSuccess: () => {
      toast.success('API Key revoked')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  // Hosts
  const { data: hosts, isLoading: hostsLoading } = useQuery({
    queryKey: ['hosts'],
    queryFn: () => api.get<Host[]>('/hosts'),
  })
  const [hostName, setHostName] = useState('')
  const registerHostMut = useMutation({
    mutationFn: () =>
      api.post('/hosts', {
        name: hostName || `KVM Node #${(hosts?.length ?? 0) + 1}`,
        agent_url: 'wss://127.0.0.1:8765',
        total_vcpu: 16,
        total_ram_mb: 32768,
        total_disk_gb: 500,
      }),
    onSuccess: () => {
      toast.success('KVM host node registered')
      setHostName('')
      queryClient.invalidateQueries({ queryKey: ['hosts'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-primary">Settings &amp; CLI Setup</h1>
        <p className="text-sm sm:text-base text-ink-muted mt-1">
          Manage encrypted LLM provider keys, workstation CLI tokens, and KVM host servers.
        </p>
      </div>

      {/* Quick CLI Guide */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-ink-primary">Ready-to-Run CLI Commands</h2>
        </div>
        <p className="text-sm text-ink-muted">
          The <code className="font-mono text-ink-primary">./sandboxctl</code> tool in this repository is already authenticated against the local Control Plane using your default key:
        </p>
        <div className="p-3 bg-bg-base border border-rule-frame rounded-sm flex items-center justify-between gap-2 font-mono text-xs sm:text-sm">
          <code className="text-emerald-300 truncate">{DEFAULT_LIVE_DEMO_KEY}</code>
          <button
            type="button"
            onClick={() => copyText('default-key', DEFAULT_LIVE_DEMO_KEY)}
            className="btn-secondary px-3 py-1.5 min-h-[34px] text-xs shrink-0"
          >
            {copiedId === 'default-key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            Copy Key
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-bg-base border border-rule-frame rounded-sm">
            <div className="text-ink-muted mb-1 font-sans">Check backend &amp; fleet status:</div>
            <code className="text-ink-primary font-semibold">./sandboxctl status &amp;&amp; ./sandboxctl list</code>
          </div>
          <div className="p-3 bg-bg-base border border-rule-frame rounded-sm">
            <div className="text-ink-muted mb-1 font-sans">Deploy &amp; watch live killswitch freeze:</div>
            <code className="text-ink-primary font-semibold">./sandboxctl deploy --name cli-vm --scenario loop</code>
          </div>
        </div>
      </section>

      {/* LLM Credentials */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-ink-primary">LLM Provider Keys (Encrypted Proxy Vault)</h2>
        </div>
        <p className="text-sm text-ink-muted">
          Keys are encrypted at rest with AES-256-GCM and injected on the host proxy. Virtual machines never see your raw keys.
        </p>
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="sm:w-44">
              <label className="block text-sm text-ink-muted mb-1.5">Provider</label>
              <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-ink-muted mb-1.5">API Key</label>
              <input
                type="password"
                placeholder="sk-... (minimum 10 characters)"
                className="input"
                value={llmKey}
                onChange={(e) => setLlmKey(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => saveLlmMut.mutate()}
              disabled={llmKey.length < 10 || saveLlmMut.isPending}
              className="btn-primary px-6"
            >
              {saveLlmMut.isPending ? <Spinner size="sm" /> : 'Encrypt & Save'}
            </button>
          </div>

          <div className="space-y-2.5">
            {llmLoading ? (
              <Spinner size="sm" />
            ) : (
              llmCreds?.map((c: LLMCredential) => (
                <div key={c.id} className="flex justify-between items-center p-3.5 bg-bg-base rounded-sm border border-rule-frame">
                  <span className="capitalize font-medium text-ink-primary">{c.provider}</span>
                  <span className="badge-running">Encrypted &amp; Active</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* API Keys */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-ink-primary">CLI Access Keys</h2>
        </div>
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm text-ink-muted mb-1.5">New Token Name</label>
              <input
                type="text"
                placeholder="e.g. Teacher Evaluation Laptop"
                className="input"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => createKeyMut.mutate()}
              disabled={!keyName || createKeyMut.isPending}
              className="btn-primary px-5"
            >
              {createKeyMut.isPending ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />} Generate Key
            </button>
          </div>

          {newKey && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/35 rounded-sm space-y-2">
              <div className="text-sm text-emerald-300 font-semibold">
                New API Key Created — Copy it now:
              </div>
              <div className="flex items-center justify-between gap-2 bg-bg-base p-3 rounded-sm border border-rule-frame">
                <code className="font-mono text-sm text-ink-primary break-all">{newKey}</code>
                <button
                  type="button"
                  onClick={() => copyText('new-key', newKey)}
                  className="btn-secondary px-3 py-1.5 min-h-[34px] text-xs shrink-0"
                >
                  {copiedId === 'new-key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {keysLoading ? (
              <Spinner size="sm" />
            ) : (
              apiKeys?.map((k: ApiKey) => (
                <div key={k.id} className="flex justify-between items-center p-3.5 bg-bg-base rounded-sm border border-rule-frame">
                  <div>
                    <div className="font-medium text-ink-primary">{k.name}</div>
                    <div className="text-xs text-ink-muted font-mono">{k.key_prefix}...</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Revoke key "${k.name}"?`)) revokeKeyMut.mutate(k.id)
                    }}
                    className="p-2 text-ink-muted hover:text-red-300 hover:bg-red-500/10 rounded-sm transition-colors"
                    aria-label={`Revoke ${k.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Connected Hosts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-ink-primary">Connected KVM Hosts</h2>
        </div>
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm text-ink-muted mb-1.5">Host Node Label</label>
              <input
                type="text"
                placeholder="e.g. Lab Linux Node #2"
                className="input"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => registerHostMut.mutate()}
              disabled={registerHostMut.isPending}
              className="btn-secondary px-5"
            >
              <Plus className="w-4 h-4" /> Register Host Node
            </button>
          </div>

          <div className="space-y-3">
            {hostsLoading ? (
              <Spinner size="sm" />
            ) : (
              hosts?.map((h: Host) => (
                <div key={h.id} className="flex justify-between items-center p-4 bg-bg-base rounded-sm border border-rule-frame">
                  <div>
                    <div className="font-semibold text-ink-primary">{h.name}</div>
                    <div className="text-xs text-ink-muted font-mono mt-0.5">
                      {h.agent_url} · {h.firecracker_version || 'Firecracker v1.7.0'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-ink-primary">
                      {h.total_vcpu} vCPU · {Math.round(h.total_ram_mb / 1024)} GB RAM
                    </div>
                    <span className="badge-running mt-1 inline-flex">Active</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
