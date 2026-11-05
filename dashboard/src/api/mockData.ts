import type { Sandbox, Host, Policy, LLMCredential, ApiKey, User } from './types'

export const mockUser: User = {
  id: 'usr-student-01',
  email: 'student.cse@campus.edu',
  username: 'student_dev',
  display_name: 'Zameer (Sandbox Admin)',
  avatar_url: null,
  is_admin: true,
}

let sandboxes: Sandbox[] = [
  {
    id: 'sb-rogue-01',
    owner_id: 'usr-student-01',
    host_id: 'host-01',
    policy_id: 'pol-cost-cap',
    name: 'demo-rogue-agent',
    state: 'FROZEN',
    is_demo: true,
    vcpu_count: 2,
    mem_size_mb: 1024,
    total_cost_usd: 0.0102,
    total_tokens: 1284,
    total_requests: 4,
    trip_reason: 'max_cost_usd ($0.01 reached)',
    trip_metric_value: 0.0102,
    trip_to_pause_latency_ms: 47,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    started_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    frozen_at: new Date(Date.now() - 1000 * 60 * 13).toISOString(),
    destroyed_at: null,
  },
  {
    id: 'sb-swe-02',
    owner_id: 'usr-student-01',
    host_id: 'host-01',
    policy_id: 'pol-standard',
    name: 'swe-bench-runner',
    state: 'RUNNING',
    is_demo: false,
    vcpu_count: 4,
    mem_size_mb: 2048,
    total_cost_usd: 0.184,
    total_tokens: 14250,
    total_requests: 19,
    trip_reason: null,
    trip_metric_value: null,
    trip_to_pause_latency_ms: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    frozen_at: null,
    destroyed_at: null,
  },
  {
    id: 'sb-test-03',
    owner_id: 'usr-student-01',
    host_id: 'host-01',
    policy_id: 'pol-standard',
    name: 'code-review-worker',
    state: 'STOPPED',
    is_demo: false,
    vcpu_count: 2,
    mem_size_mb: 1024,
    total_cost_usd: 0.042,
    total_tokens: 3890,
    total_requests: 6,
    trip_reason: null,
    trip_metric_value: null,
    trip_to_pause_latency_ms: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    frozen_at: null,
    destroyed_at: null,
  },
]

let hosts: Host[] = [
  {
    id: 'host-01',
    owner_id: 'usr-student-01',
    name: 'kvm-host-node-01 (Bare-Metal KVM)',
    agent_url: 'wss://kvm-node1.internal:8765',
    is_active: true,
    last_heartbeat_at: new Date().toISOString(),
    total_vcpu: 8,
    total_ram_mb: 16384,
    total_disk_gb: 120,
    firecracker_version: 'v1.7.0 (Linux 5.10.198)',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
]

let policies: Policy[] = [
  {
    id: 'pol-cost-cap',
    name: 'Demo Strict Cost Cap ($0.01)',
    owner_id: 'usr-student-01',
    max_cost_usd: 0.01,
    max_tokens: 10000,
    max_tokens_per_minute: 5000,
    max_requests_per_minute: 20,
    max_cpu_seconds: 60,
    max_wallclock_seconds: 300,
    loop_detection_n: 3,
    loop_detection_window_s: 8,
    loop_similarity_threshold: 0.95,
    action: 'pause',
    is_default: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'pol-standard',
    name: 'Developer Sandbox Policy ($1.00 Cap)',
    owner_id: 'usr-student-01',
    max_cost_usd: 1.0,
    max_tokens: 100000,
    max_tokens_per_minute: 25000,
    max_requests_per_minute: 60,
    max_cpu_seconds: 600,
    max_wallclock_seconds: 1800,
    loop_detection_n: 5,
    loop_detection_window_s: 15,
    loop_similarity_threshold: 0.95,
    action: 'pause',
    is_default: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
]

let llmCreds: LLMCredential[] = [
  {
    id: 'llm-01',
    provider: 'openai',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'llm-02',
    provider: 'anthropic',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
]

let apiKeys: ApiKey[] = [
  {
    id: 'key-01',
    name: 'MacBook CLI (sandboxctl)',
    key_prefix: 'csb_live_92a1',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    last_used_at: new Date().toISOString(),
  },
]

export const mockStore = {
  getSandboxes: () => [...sandboxes],
  getSandbox: (id: string) => sandboxes.find((s) => s.id === id) || sandboxes[0],
  createSandbox: (data: Partial<Sandbox>) => {
    const newSb: Sandbox = {
      id: `sb-${Math.random().toString(36).slice(2, 8)}`,
      owner_id: 'usr-student-01',
      host_id: data.host_id ?? 'host-01',
      policy_id: data.policy_id ?? 'pol-cost-cap',
      name: data.name || `sandbox-${sandboxes.length + 1}`,
      state: 'RUNNING',
      is_demo: data.is_demo ?? false,
      vcpu_count: data.vcpu_count || 2,
      mem_size_mb: data.mem_size_mb || 1024,
      total_cost_usd: 0.0001,
      total_tokens: 120,
      total_requests: 1,
      trip_reason: null,
      trip_metric_value: null,
      trip_to_pause_latency_ms: null,
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      frozen_at: null,
      destroyed_at: null,
    }
    sandboxes = [newSb, ...sandboxes]
    return newSb
  },
  launchDemo: () => {
    const demoSb: Sandbox = {
      id: `sb-demo-${Date.now().toString().slice(-4)}`,
      owner_id: 'usr-student-01',
      host_id: 'host-01',
      policy_id: 'pol-cost-cap',
      name: `demo-rogue-agent-${sandboxes.length + 1}`,
      state: 'RUNNING',
      is_demo: true,
      vcpu_count: 2,
      mem_size_mb: 1024,
      total_cost_usd: 0.0002,
      total_tokens: 180,
      total_requests: 1,
      trip_reason: null,
      trip_metric_value: null,
      trip_to_pause_latency_ms: null,
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      frozen_at: null,
      destroyed_at: null,
    }
    sandboxes = [demoSb, ...sandboxes]
    return demoSb
  },
  pauseSandbox: (id: string) => {
    sandboxes = sandboxes.map((s) => (s.id === id ? { ...s, state: 'FROZEN' as const } : s))
    return { ok: true }
  },
  resumeSandbox: (id: string, newCostCap?: number) => {
    sandboxes = sandboxes.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          state: 'RUNNING' as const,
          trip_reason: null,
          trip_to_pause_latency_ms: null,
        }
      }
      return s
    })
    if (newCostCap && policies[0]) {
      policies[0].max_cost_usd = newCostCap
    }
    return { ok: true }
  },
  destroySandbox: (id: string) => {
    sandboxes = sandboxes.filter((s) => s.id !== id)
    return { ok: true }
  },
  getHosts: () => [...hosts],
  getPolicies: () => [...policies],
  getPolicy: (id: string) => policies.find((p) => p.id === id) || policies[0],
  getLlmCreds: () => [...llmCreds],
  saveLlmCred: (provider: string) => {
    if (!llmCreds.find((c) => c.provider === provider)) {
      llmCreds.push({
        id: `llm-${Date.now()}`,
        provider,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    return { ok: true }
  },
  getApiKeys: () => [...apiKeys],
  createApiKey: (name: string) => {
    const raw_key = `csb_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name,
      key_prefix: raw_key.slice(0, 12),
      raw_key,
      is_active: true,
      created_at: new Date().toISOString(),
      last_used_at: null,
    }
    apiKeys = [newKey, ...apiKeys]
    return newKey
  },
  revokeApiKey: (id: string) => {
    apiKeys = apiKeys.filter((k) => k.id !== id)
    return { ok: true }
  },
}
