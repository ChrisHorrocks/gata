import { apiRequest } from '@/api/client'

export type Trip = {
  id: string
  name: string
  start_date: string
  emergency_notes: string | null
  version: number
  role: 'organiser' | 'member'
}

export type TripListResponse = {
  trips: Trip[]
}

export function fetchTrips(): Promise<TripListResponse> {
  return apiRequest<TripListResponse>('/api/v1/trips')
}

export function fetchTrip(tripId: string): Promise<Trip> {
  return apiRequest<Trip>(`/api/v1/trips/${tripId}`)
}

export function createTrip(input: { name: string; start_date: string }): Promise<Trip> {
  return apiRequest<Trip>('/api/v1/trips', { method: 'POST', body: input })
}

export type TripPatchInput = {
  version: number
  name?: string
  start_date?: string
  emergency_notes?: string | null
}

export function patchTrip(tripId: string, input: TripPatchInput): Promise<Trip> {
  return apiRequest<Trip>(`/api/v1/trips/${tripId}`, { method: 'PATCH', body: input })
}

export function deleteTrip(tripId: string, version: number): Promise<void> {
  return apiRequest<void>(`/api/v1/trips/${tripId}`, {
    method: 'DELETE',
    body: { version },
  })
}