/**
 * Throwaway in-memory trip state — issue #6 prototype
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { packWeightsForTrip } from './packWeight'
import { createInitialTrip } from './sampleTrip'
import type { Day, DayKind, GearLibraryItem, MealSlot, Trip, TripGearItem } from './types'

interface TripContextValue {
  trip: Trip
  selectedDayId: string | null
  setSelectedDayId: (id: string | null) => void
  packWeights: Record<string, number>
  viewingMemberId: string
  setViewingMemberId: (id: string) => void
  updateDayStats: (dayId: string, patch: Partial<Pick<Day, 'distanceKm' | 'ascentM' | 'descentM'>>) => void
  setDayKind: (dayId: string, kind: DayKind) => void
  reorderDay: (dayId: string, direction: 'up' | 'down') => void
  addWalkingDay: () => void
  placeCamp: (dayId: string, lat: number, lng: number, name?: string) => void
  assignCarrier: (gearItemId: string, carrierId: string | null) => void
  addFromLibrary: (libraryItem: GearLibraryItem) => void
  libraryForMember: (memberId: string) => GearLibraryItem[]
  needsCarrierItems: TripGearItem[]
}

const TripPrototypeContext = createContext<TripContextValue | null>(null)

export function TripPrototypeProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<Trip>(() => createInitialTrip())
  const [selectedDayId, setSelectedDayId] = useState<string | null>(() => trip.days[0]?.id ?? null)
  const [viewingMemberId, setViewingMemberId] = useState(() => trip.members[0]?.id ?? '')

  const packWeights = useMemo(() => packWeightsForTrip(trip), [trip])

  const updateDayStats = useCallback((dayId: string, patch: Partial<Pick<Day, 'distanceKm' | 'ascentM' | 'descentM'>>) => {
    setTrip((t) => ({
      ...t,
      days: t.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
    }))
  }, [])

  const setDayKind = useCallback((dayId: string, kind: DayKind) => {
    setTrip((t) => ({
      ...t,
      days: t.days.map((d) => {
        if (d.id !== dayId) return d
        if (kind === 'rest') {
          const idx = t.days.findIndex((x) => x.id === dayId)
          const prev = idx > 0 ? t.days[idx - 1] : null
          return { ...d, kind, distanceKm: 0, ascentM: 0, descentM: 0, campId: prev?.campId ?? d.campId }
        }
        return { ...d, kind }
      }),
    }))
  }, [])

  const reorderDay = useCallback((dayId: string, direction: 'up' | 'down') => {
    setTrip((t) => {
      const idx = t.days.findIndex((d) => d.id === dayId)
      if (idx < 0) return t
      const swap = direction === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= t.days.length) return t
      const days = [...t.days]
      ;[days[idx], days[swap]] = [days[swap], days[idx]]
      return { ...t, days }
    })
  }, [])

  const addWalkingDay = useCallback(() => {
    setTrip((t) => {
      const n = t.days.length + 1
      const newCampId = `camp-new-${Date.now()}`
      const last = t.days[t.days.length - 1]
      const lat = last ? t.camps.find((c) => c.id === last.campId)?.lat ?? 53.59 : 53.59
      const lng = last ? t.camps.find((c) => c.id === last.campId)?.lng ?? -2.03 : -2.03
      const newDay: Day = {
        id: `day-${Date.now()}`,
        kind: 'walking',
        distanceKm: 10,
        ascentM: 200,
        campId: newCampId,
      }
      return {
        ...t,
        camps: [...t.camps, { id: newCampId, name: `Camp day ${n}`, lat, lng }],
        days: [...t.days, newDay],
      }
    })
  }, [])

  const placeCamp = useCallback((dayId: string, lat: number, lng: number, name?: string) => {
    setTrip((t) => {
      const day = t.days.find((d) => d.id === dayId)
      if (!day?.campId) return t
      return {
        ...t,
        camps: t.camps.map((c) =>
          c.id === day.campId
            ? { ...c, lat, lng, name: name?.trim() ? name : c.name }
            : c,
        ),
      }
    })
  }, [])

  const assignCarrier = useCallback((gearItemId: string, carrierId: string | null) => {
    setTrip((t) => ({
      ...t,
      gearItems: t.gearItems.map((item) =>
        item.id === gearItemId
          ? {
              ...item,
              carrierId,
              needsCarrier: item.shared && !carrierId,
            }
          : item,
      ),
    }))
  }, [])

  const addFromLibrary = useCallback((libraryItem: GearLibraryItem) => {
    setTrip((t) => {
      const exists = t.gearItems.some(
        (g) => g.libraryItemId === libraryItem.id && g.ownerId === libraryItem.ownerId && !g.shared,
      )
      if (exists) return t
      const newItem: TripGearItem = {
        id: `trip-${libraryItem.id}-${Date.now()}`,
        name: libraryItem.name,
        weightGrams: libraryItem.weightGrams,
        libraryItemId: libraryItem.id,
        ownerId: libraryItem.ownerId,
        shared: false,
        carrierId: null,
        needsCarrier: false,
      }
      return { ...t, gearItems: [...t.gearItems, newItem] }
    })
  }, [])

  const libraryForMember = useCallback(
    (memberId: string) => trip.gearLibrary.filter((l) => l.ownerId === memberId),
    [trip.gearLibrary],
  )

  const needsCarrierItems = useMemo(
    () => trip.gearItems.filter((g) => g.shared && g.needsCarrier),
    [trip.gearItems],
  )

  const value: TripContextValue = {
    trip,
    selectedDayId,
    setSelectedDayId,
    packWeights,
    viewingMemberId,
    setViewingMemberId,
    updateDayStats,
    setDayKind,
    reorderDay,
    addWalkingDay,
    placeCamp,
    assignCarrier,
    addFromLibrary,
    libraryForMember,
    needsCarrierItems,
  }

  return <TripPrototypeContext.Provider value={value}>{children}</TripPrototypeContext.Provider>
}

export function useTripPrototype() {
  const ctx = useContext(TripPrototypeContext)
  if (!ctx) throw new Error('useTripPrototype must be used within TripPrototypeProvider')
  return ctx
}

export function mealSlotLabel(slot: MealSlot): string {
  const map: Record<MealSlot, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  }
  return map[slot]
}
