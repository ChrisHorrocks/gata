import { apiRequest } from '@/api/client'

export type DayKind = 'walking' | 'rest'

export type Day = {
  id: string
  position: number
  kind: DayKind
  date: string
  distance_km: string | null
  ascent_m: number | null
  descent_m: number | null
  version: number
}

export type DayListResponse = {
  days: Day[]
  total_distance_km: string
  total_ascent_m: number
}

export function fetchDays(tripId: string): Promise<DayListResponse> {
  return apiRequest<DayListResponse>(`/api/v1/trips/${tripId}/days`)
}

export type DayCreateInput = {
  kind: DayKind
  distance_km?: string
  ascent_m?: number
  descent_m?: number | null
}

export function createDay(tripId: string, input: DayCreateInput): Promise<Day> {
  return apiRequest<Day>(`/api/v1/trips/${tripId}/days`, { method: 'POST', body: input })
}

export type DayPatchInput = {
  version: number
  kind?: DayKind
  distance_km?: string | null
  ascent_m?: number | null
  descent_m?: number | null
}

export function patchDay(tripId: string, dayId: string, input: DayPatchInput): Promise<Day> {
  return apiRequest<Day>(`/api/v1/trips/${tripId}/days/${dayId}`, { method: 'PATCH', body: input })
}

export function deleteDay(tripId: string, dayId: string, version: number): Promise<void> {
  return apiRequest<void>(`/api/v1/trips/${tripId}/days/${dayId}`, {
    method: 'DELETE',
    body: { version },
  })
}

export type DayOrderEntry = { id: string; version: number }

export function reorderDays(tripId: string, order: DayOrderEntry[]): Promise<DayListResponse> {
  return apiRequest<DayListResponse>(`/api/v1/trips/${tripId}/days/order`, {
    method: 'PUT',
    body: { order },
  })
}