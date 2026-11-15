import { apiRequest } from '@/api/client'

export function requestMagicLink(email: string): Promise<{ message: string }> {
  return apiRequest('/api/v1/magic-links', {
    method: 'POST',
    body: { email },
  })
}

export function inspectMagicLink(token: string): Promise<{ email: string }> {
  return apiRequest('/api/v1/magic-links/inspect', {
    method: 'POST',
    body: { token },
  })
}

export function consumeMagicLink(token: string): Promise<{ user: { email: string } }> {
  return apiRequest('/api/v1/magic-links/consume', {
    method: 'POST',
    body: { token },
  })
}