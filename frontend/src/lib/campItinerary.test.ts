import { describe, expect, it } from 'vitest'

import { effectiveCampForDay, orderedCampPins } from '@/lib/campItinerary'

describe('campItinerary', () => {
  it('rest days inherit the previous walking camp', () => {
    const days = [
      {
        id: 'd1',
        position: 0,
        kind: 'walking' as const,
        date: '2026-06-01',
        distance_km: '10',
        ascent_m: 100,
        descent_m: null,
        version: 1,
      },
      {
        id: 'd2',
        position: 1,
        kind: 'rest' as const,
        date: '2026-06-02',
        distance_km: null,
        ascent_m: null,
        descent_m: null,
        version: 1,
      },
    ]
    const camps = [
      {
        id: 'c1',
        day_id: 'd1',
        name: 'Camp 1',
        latitude: 1,
        longitude: 2,
        notes: null,
        version: 1,
        pin_number: 1,
      },
    ]
    expect(effectiveCampForDay(days, camps, 'd2')?.id).toBe('c1')
    expect(orderedCampPins(days, camps)).toHaveLength(1)
  })
})