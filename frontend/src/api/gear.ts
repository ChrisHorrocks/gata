import { apiRequest } from '@/api/client'

export type GearItem = {
  id: string
  name: string
  weight_grams: number
  category: string | null
  created_at: string
}

export type GearItemInput = {
  name: string
  weight_grams: number
  category?: string | null
}

export function fetchGear(): Promise<GearItem[]> {
  return apiRequest<GearItem[]>('/api/v1/me/gear')
}

export function createGearItem(body: GearItemInput): Promise<GearItem> {
  return apiRequest<GearItem>('/api/v1/me/gear', { method: 'POST', body })
}

export function updateGearItem(id: string, body: Partial<GearItemInput>): Promise<GearItem> {
  return apiRequest<GearItem>(`/api/v1/me/gear/${id}`, { method: 'PATCH', body })
}

export function deleteGearItem(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/me/gear/${id}`, { method: 'DELETE' })
}