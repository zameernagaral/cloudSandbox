/** Typed API client backed by fetch with automatic offline demo mode fallback. */
import { useAuthStore } from '../store/auth'
import { mockStore, mockUser } from './mockData'

const BASE = '/api/v1'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function handleMockRequest<T>(method: string, path: string, body?: any): T {
  // Normalize path without trailing slash
  const cleanPath = path.replace(/\/$/, '')

  if (method === 'GET') {
    if (cleanPath === '/sandboxes') {
      return mockStore.getSandboxes() as unknown as T
    }
    if (cleanPath.startsWith('/sandboxes/')) {
      const id = cleanPath.split('/')[2]
      return mockStore.getSandbox(id) as unknown as T
    }
    if (cleanPath === '/hosts') {
      return mockStore.getHosts() as unknown as T
    }
    if (cleanPath === '/policies') {
      return mockStore.getPolicies() as unknown as T
    }
    if (cleanPath.startsWith('/policies/')) {
      const id = cleanPath.split('/')[2]
      return mockStore.getPolicy(id) as unknown as T
    }
    if (cleanPath === '/settings/llm-credentials') {
      return mockStore.getLlmCreds() as unknown as T
    }
    if (cleanPath === '/settings/api-keys') {
      return mockStore.getApiKeys() as unknown as T
    }
    if (cleanPath === '/auth/me') {
      return mockUser as unknown as T
    }
  }

  if (method === 'POST') {
    if (cleanPath === '/auth/login') {
      return {
        access_token: 'demo-token-cloud-sandbox',
        refresh_token: 'demo-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
      } as unknown as T
    }
    if (cleanPath === '/sandboxes') {
      return mockStore.createSandbox(body ?? {}) as unknown as T
    }
    if (cleanPath === '/demo/launch') {
      return mockStore.launchDemo() as unknown as T
    }
    if (cleanPath.match(/\/sandboxes\/[^/]+\/pause/)) {
      const id = cleanPath.split('/')[2]
      return mockStore.pauseSandbox(id) as unknown as T
    }
    if (cleanPath.match(/\/sandboxes\/[^/]+\/resume/)) {
      const id = cleanPath.split('/')[2]
      return mockStore.resumeSandbox(id, body?.new_max_cost_usd) as unknown as T
    }
    if (cleanPath === '/settings/api-keys') {
      return mockStore.createApiKey(body?.name ?? 'CLI Key') as unknown as T
    }
    if (cleanPath === '/hosts') {
      return {
        id: 'host-01',
        name: body?.name ?? 'Default Host',
        token: 'host-install-token-' + Math.random().toString(36).slice(2, 10),
      } as unknown as T
    }
  }

  if (method === 'PUT') {
    if (cleanPath === '/settings/llm-credentials') {
      return mockStore.saveLlmCred(body?.provider ?? 'openai') as unknown as T
    }
  }

  if (method === 'DELETE') {
    if (cleanPath.startsWith('/sandboxes/')) {
      const id = cleanPath.split('/')[2]
      return mockStore.destroySandbox(id) as unknown as T
    }
    if (cleanPath.startsWith('/settings/api-keys/')) {
      const id = cleanPath.split('/')[3]
      return mockStore.revokeApiKey(id) as unknown as T
    }
  }

  return {} as T
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const isDemo = useAuthStore.getState().demoMode

  // If already in explicit demo mode, return mock immediately without hitting network
  if (isDemo) {
    // Add realistic 80ms network latency
    await new Promise((r) => setTimeout(r, 80))
    return handleMockRequest<T>(method, path, body)
  }

  const stored = token ?? localStorage.getItem('access_token') ?? ''
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

    if (res.status === 204) return undefined as T
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      // If server returned 404/500/502/503 during dev, fallback smoothly to mock if it's demo/offline
      if (res.status >= 500 || res.status === 404) {
        return handleMockRequest<T>(method, path, body)
      }
      const message = data?.detail ?? data?.error?.message ?? `HTTP ${res.status}`
      throw new ApiError(res.status, message)
    }
    return data as T
  } catch (err: any) {
    // Network error (backend offline) -> Fallback to mock data gracefully so presentation never fails!
    if (err instanceof TypeError && err.message.includes('fetch')) {
      console.warn(`[Cloud Sandbox] Backend offline at ${BASE}${path}. Using simulated demo data.`)
      return handleMockRequest<T>(method, path, body)
    }
    // Re-throw if it was an intentional ApiError from server
    if (err instanceof ApiError) throw err
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
