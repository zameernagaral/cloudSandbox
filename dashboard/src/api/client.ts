/** Typed API client backed by fetch. */

const BASE = '/api/v1'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const stored = token ?? localStorage.getItem('access_token') ?? ''
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (stored) headers['Authorization'] = `Bearer ${stored}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = data?.detail ?? data?.error?.message ?? `HTTP ${res.status}`
    throw new ApiError(res.status, message)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
