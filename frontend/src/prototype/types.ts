/**
 * Throwaway prototype types — How should the itinerary and kit screens look and behave? (#6)
 */

export type MemberRole = 'organiser' | 'member'

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

export interface Member {
  id: string
  displayName: string
  role: MemberRole
  emergencyContacts: EmergencyContact[]
  libraryItemIds: string[]
}

export interface GearLibraryItem {
  id: string
  ownerId: string
  name: string
  weightGrams: number
  category?: string
}

export type DayKind = 'walking' | 'rest'

export interface Camp {
  id: string
  name: string
  lat: number
  lng: number
  notes?: string
}

export interface Day {
  id: string
  kind: DayKind
  /** Walking: km; rest: 0 */
  distanceKm: number
  ascentM: number
  descentM?: number
  campId: string | null
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Meal {
  id: string
  dayId: string
  slot: MealSlot
  name: string
  weightGrams: number
  kcal: number
  carrierId: string | null
  needsCarrier: boolean
}

export interface TripGearItem {
  id: string
  name: string
  weightGrams: number
  libraryItemId: string | null
  ownerId: string | null
  shared: boolean
  carrierId: string | null
  needsCarrier: boolean
}

export interface Trip {
  id: string
  name: string
  startDate: string
  emergencyNotes: string
  members: Member[]
  camps: Camp[]
  days: Day[]
  gearItems: TripGearItem[]
  meals: Meal[]
  gearLibrary: GearLibraryItem[]
}
