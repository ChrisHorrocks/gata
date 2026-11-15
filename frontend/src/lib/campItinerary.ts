import type { Camp } from '@/api/camps'
import type { Day } from '@/api/days'

export type CampPin = Camp & { dayIndex: number }

export function campByDayId(camps: Camp[]): Map<string, Camp> {
  return new Map(camps.map((camp) => [camp.day_id, camp]))
}

/** Rest days inherit the previous walking day's camp. */
export function effectiveCampForDay(
  days: Day[],
  camps: Camp[],
  dayId: string,
): Camp | null {
  const byDay = campByDayId(camps)
  const index = days.findIndex((day) => day.id === dayId)
  if (index < 0) {
    return null
  }
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const day = days[cursor]
    if (day.kind === 'walking') {
      return byDay.get(day.id) ?? null
    }
  }
  return null
}

export function orderedCampPins(days: Day[], camps: Camp[]): CampPin[] {
  const byDay = campByDayId(camps)
  return days.flatMap((day, dayIndex) => {
    if (day.kind !== 'walking') {
      return []
    }
    const camp = byDay.get(day.id)
    return camp ? [{ ...camp, dayIndex }] : []
  })
}

export function campLineCoordinates(pins: CampPin[]): [number, number][] {
  return pins.map((pin) => [pin.longitude, pin.latitude])
}