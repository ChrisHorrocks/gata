import { apiRequest } from '@/api/client'

export type Camp = {
  id: string
  day_id: string
  name: string
  latitude: number
  longitude: number
  notes: string | null
  version: number
  pin_number: number
}

export type CampListResponse = {
  camps: Camp[]
}

export function fetchCamps(tripId: string): Promise<CampListResponse> {
  return apiRequest<CampListResponse>(`/api/v1/trips/${tripId}/camps`)
}

export type CampCreateInput = {
  day_id: string
  name: string
  latitude: number
  longitude: number
  notes?: string | null
}

export function createCamp(tripId: string, input: CampCreateInput): Promise<Camp> {
  return apiRequest<Camp>(`/api/v1/trips/${tripId}/camps`, { method: 'POST', body: input })
}

export type CampPatchInput = {
  version: number
  name?: string
  latitude?: number
  longitude?: number
  notes?: string | null
}

export function patchCamp(tripId: string, campId: string, input: CampPatchInput): Promise<Camp> {
  return apiRequest<Camp>(`/api/v1/trips/${tripId}/camps/${campId}`, {
    method: 'PATCH',
    body: input,
  })
}