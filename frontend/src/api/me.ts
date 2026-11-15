import { apiRequest } from '@/api/client'

export type EmergencyContact = {
  name: string
  relationship: string
  phone: string
}

export type MeResponse = {
  id: string
  email: string
  display_name: string | null
  emergency_contacts: EmergencyContact[]
}

export type MePatch = {
  display_name?: string | null
  emergency_contacts?: EmergencyContact[]
}

export function fetchMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/v1/me')
}

export function patchMe(body: MePatch): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/v1/me', { method: 'PATCH', body })
}