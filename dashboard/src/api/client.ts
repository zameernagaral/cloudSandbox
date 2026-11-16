/** Typed API client wired directly to live Control Plane REST API with graceful offline fallback. */
import { useAuthStore, DEFAULT_LIVE_DEMO_KEY } from '../store/auth'
import { mockStore, mockUser } from './mockData'

const BASE = '/api/v1'

let backendLive = false

export function isBackendLive(): boolean {
  return backendLive
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function handleMockRequest<T>(method: string, path: string, body?: any): T {
  const cleanPath = path.split('?')[0].replace(/\/$/, '')

  if (method === 'GET') {
    if (cleanPath === '/sandboxes') return mockStore.getSandboxes() as unknown as T
    if (cleanPath.endsWith('/logs')) {
      const id = cleanPath.split('/')[2]
      const sb = mockStore.getSandbox(id)
      return {
        sandbox_id: sb.id,
        sandbox: sb,
        policy_max_cost_usd: 0.01,
        meters: {
          sandbox_id: sb.id,
          state: sb.state,
          cost_usd: sb.total_cost_usd,
          tokens: sb.total_tokens,
          requests: sb.total_requests,
          tokens_per_minute: 1200,
          requests_per_minute: 12,
          cpu_seconds: 1.5,
          wallclock_seconds: 12,
          memory_mb: 312,
        },
        logs: [
          { time: '00:00:00.010', type: 'system', text: '[OFFLINE FALLBACK] Control plane unreachable at :8000; showing cached snapshot.' },
        ],
      } as unknown as T
    }
    if (cleanPath.startsWith('/sandboxes/')) {
      const id = cleanPath.split('/')[2]
      return mockStore.getSandbox(id) as unknown as T
    }
    if (cleanPath === '/hosts') return mockStore.getHosts() as unknown as T
    if (cleanPath === '/policies') return mockStore.getPolicies() as unknown as T
    if (cleanPath.startsWith('/policies/')) {
      const id = cleanPath.split('/')[2]
      return mockStore.getPolicy(id) as unknown as T
    }
    if (cleanPath === '/settings/llm-credentials') return mockStore.getLlmCreds() as unknown as T
    if (cleanPath === '/settings/api-keys') return mockStore.getApiKeys() as unknown as T
    if (cleanPath === '/auth/me') return mockUser as unknown as T
    if (cleanPath === '/admin/overview') return mockStore.getAdminOverview() as unknown as T
    if (cleanPath === '/admin/users') return mockStore.getAdminUsers() as unknown as T
    if (cleanPath === '/admin/audit-logs') return mockStore.getAuditLogs() as unknown as T
    if (cleanPath === '/admin/alerts') return mockStore.getBreachAlerts() as unknown as T
  }

  if (method === 'POST') {
    if (cleanPath === '/auth/login') {
      return {
        access_token: DEFAULT_LIVE_DEMO_KEY,
        refresh_token: 'demo-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
      } as unknown as T
    }
    if (cleanPath === '/sandboxes') return mockStore.createSandbox(body ?? {}) as unknown as T
    if (cleanPath === '/demo/launch') return mockStore.launchDemo() as unknown as T
    if (cleanPath.match(/\/sandboxes\/[^/]+\/pause/)) {
      const id = cleanPath.split('/')[2]
      return mockStore.pauseSandbox(id) as unknown as T
    }
    if (cleanPath.match(/\/sandboxes\/[^/]+\/resume/)) {
      const id = cleanPath.split('/')[2]
      return mockStore.resumeSandbox(id, body?.new_max_cost_usd) as unknown as T
    }
    if (cleanPath.match(/\/sandboxes\/[^/]+\/run/)) {
      const id = cleanPath.split('/')[2]
      return mockStore.getSandbox(id) as unknown as T
    }
    if (cleanPath.match(/\/sandboxes\/[^/]+\/exec/)) {
      return { output: [{ time: '00:00:00.000', type: 'system', text: 'Offline fallback mode.' }], logs: [] } as unknown as T
    }
    if (cleanPath === '/settings/api-keys') return mockStore.createApiKey(body?.name ?? 'CLI Key') as unknown as T
    if (cleanPath === '/hosts') {
      return {
        id: 'host-01',
        host_id: 'host-01',
        name: body?.name ?? 'Default Host',
        token: 'host-install-token-' + Math.random().toString(36).slice(2, 10),
      } as unknown as T
    }
  }

  if (method === 'PUT') {
    if (cleanPath === '/settings/llm-credentials') return mockStore.saveLlmCred(body?.provider ?? 'openai') as unknown as T
  }

  if (method === 'DELETE') {
    if (cleanPath.startsWith('/sandboxes/')) return mockStore.destroySandbox(cleanPath.split('/')[2]) as unknown as T
    if (cleanPath.startsWith('/settings/api-keys/')) return mockStore.revokeApiKey(cleanPath.split('/')[3]) as unknown as T
  }

  return {} as T
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const storeToken = useAuthStore.getState().accessToken
  let stored = token ?? localStorage.getItem('access_token') ?? storeToken ?? ''
  // Automatically upgrade legacy mock JWT to valid API key accepted by live Control Plane
  if (stored === 'demo-token-cloud-sandbox') {
    stored = DEFAULT_LIVE_DEMO_KEY
    localStorage.setItem('access_token', stored)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (stored) headers['Authorization'] = `Bearer ${stored}`

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      backendLive = false
      return handleMockRequest<T>(method, path, body)
    }

    backendLive = true
    if (res.status === 204) return undefined as T
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message =
        typeof data?.detail === 'string'
          ? data.detail
          : data?.error?.message ?? `HTTP ${res.status}`
      throw new ApiError(res.status, message)
    }
    return data as T
  } catch (err: any) {
    if (err instanceof ApiError) throw err
    backendLive = false
    console.warn(`[Cloud Sandbox] Backend offline at ${BASE}${path}. Using offline fallback data.`)
    return handleMockRequest<T>(method, path, body)
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
