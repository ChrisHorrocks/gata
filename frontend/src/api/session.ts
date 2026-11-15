import { apiRequest } from '@/api/client'

export type User = {
  id: string
  email: string
  display_name: string | null
}

export type SessionResponse = {
  user: User
}

export function fetchSession(): Promise<SessionResponse> {
  return apiRequest<SessionResponse>('/api/v1/session')
}

export function logout(): Promise<void> {
  return apiRequest<void>('/api/v1/session/logout', { method: 'POST' })
}