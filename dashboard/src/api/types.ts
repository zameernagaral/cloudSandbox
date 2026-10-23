export type SandboxState = 'CREATING' | 'RUNNING' | 'FROZEN' | 'STOPPED' | 'DESTROYED' | 'ERROR'
export type KillswitchAction = 'pause' | 'snapshot_pause' | 'destroy'

export interface User {
  id: string
  email: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_admin: boolean
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface Sandbox {
  id: string
  owner_id: string
  host_id: string | null
  policy_id: string | null
  name: string
  state: SandboxState
  is_demo: boolean
  vcpu_count: number
  mem_size_mb: number
  total_cost_usd: number
  total_tokens: number
  total_requests: number
  trip_reason: string | null
  trip_metric_value: number | null
  trip_to_pause_latency_ms: number | null
  created_at: string
  started_at: string | null
  frozen_at: string | null
  destroyed_at: string | null
}

export interface Policy {
  id: string
  name: string
  owner_id: string
  max_cost_usd: number | null
  max_tokens: number | null
  max_tokens_per_minute: number | null
  max_requests_per_minute: number | null
  max_cpu_seconds: number | null
  max_wallclock_seconds: number | null
  loop_detection_n: number
  loop_detection_window_s: number
  loop_similarity_threshold: number
  action: KillswitchAction
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Host {
  id: string
  owner_id: string
  name: string
  agent_url: string
  is_active: boolean
  last_heartbeat_at: string | null
  total_vcpu: number
  total_ram_mb: number
  total_disk_gb: number
  firecracker_version: string | null
  created_at: string
}

export interface HostRegisterResponse {
  id: string
  name: string
  token: string
}

export interface SandboxMeters {
  sandbox_id: string
  state: string
  cost_usd: number
  tokens: number
  requests: number
  tokens_per_minute: number
  requests_per_minute: number
  cpu_seconds: number
  wallclock_seconds: number
  memory_mb: number
  trip_reason?: string
  trip_to_pause_latency_ms?: number
}

export interface SandboxEvent {
  type: 'state_change' | 'meters' | 'killswitch_tripped' | 'ping' | 'frozen' | 'error'
  sandbox_id?: string
  timestamp?: string
  payload?: Record<string, unknown>
  reason?: string
  message?: string
}

export interface LLMCredential {
  id: string
  provider: string
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
  raw_key?: string
}
