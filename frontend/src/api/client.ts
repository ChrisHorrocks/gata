export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(`API error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

const CSRF_HEADER_NAME = 'X-CSRF-Token'

function csrfCookieName(): string {
  if (typeof window === 'undefined') {
    return '__Host-gata-csrf'
  }
  const { protocol, hostname } = window.location
  if (protocol === 'https:') {
    return '__Host-gata-csrf'
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'gata-csrf'
  }
  return '__Host-gata-csrf'
}

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

type ApiOptions = {
  method?: string
  body?: unknown
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {}
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }
  if (STATE_CHANGING.has(method.toUpperCase())) {
    const csrf = readCookie(csrfCookieName())
    if (csrf) {
      headers[CSRF_HEADER_NAME] = csrf
    }
  }

  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, body)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const csrfCookieNameForTests = csrfCookieName()
export const csrfHeaderNameForTests = CSRF_HEADER_NAME