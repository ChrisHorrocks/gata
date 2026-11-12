import type { Meal, Trip, TripGearItem } from './types'

export function packWeightGrams(
  memberId: string,
  gearItems: TripGearItem[],
  meals: Meal[],
): number {
  let total = 0
  for (const item of gearItems) {
    if (!item.shared && item.ownerId === memberId) {
      total += item.weightGrams
    }
    if (item.shared && item.carrierId === memberId && !item.needsCarrier) {
      total += item.weightGrams
    }
  }
  for (const meal of meals) {
    if (meal.carrierId === memberId && !meal.needsCarrier) {
      total += meal.weightGrams
    }
  }
  return total
}

export function packWeightsForTrip(trip: Trip): Record<string, number> {
  const out: Record<string, number> = {}
  for (const m of trip.members) {
    out[m.id] = packWeightGrams(m.id, trip.gearItems, trip.meals)
  }
  return out
}
