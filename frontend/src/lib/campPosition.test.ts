import { describe, expect, it } from 'vitest'

import {
  GRID_ROUND_TRIP_TOLERANCE_M,
  distanceMetres,
  formatCampGridReference,
  gridRoundTripMetres,
  gridSystemForPosition,
  parseCampPositionInput,
} from '@/lib/campPosition'

describe('campPosition', () => {
  it('converts OSGB grid references with and without spaces', () => {
    const fromSpaced = parseCampPositionInput('TG 5140 1317')
    const fromCompact = parseCampPositionInput('TG51401317')
    expect(fromSpaced.latitude).toBeCloseTo(52.65798, 3)
    expect(fromSpaced.longitude).toBeCloseTo(1.71605, 3)
    expect(fromCompact.latitude).toBeCloseTo(fromSpaced.latitude, 6)
    expect(fromCompact.longitude).toBeCloseTo(fromSpaced.longitude, 6)
    expect(gridSystemForPosition(fromSpaced.latitude, fromSpaced.longitude)).toBe('osgb')
  })

  it('converts Irish Grid references', () => {
    const position = parseCampPositionInput('O 15944 33410')
    expect(position.latitude).toBeCloseTo(53.33842, 3)
    expect(position.longitude).toBeCloseTo(-6.25974, 3)
    expect(gridSystemForPosition(position.latitude, position.longitude)).toBe('irish')
  })

  it('parses latitude and longitude', () => {
    const position = parseCampPositionInput('52.65798, 1.71605')
    expect(position.latitude).toBeCloseTo(52.65798, 5)
    expect(position.longitude).toBeCloseTo(1.71605, 5)
  })

  it('formats grid reference beside stored lat/long', () => {
    const position = parseCampPositionInput('TG 5140 1317')
    const formatted = formatCampGridReference(position.latitude, position.longitude, 10)
    expect(formatted?.system).toBe('osgb')
    expect(formatted?.gridReference).toMatch(/^TG \d{5} \d{5}$/)
    const reparsed = parseCampPositionInput(formatted!.gridReference)
    expect(distanceMetres(position, reparsed)).toBeLessThanOrEqual(GRID_ROUND_TRIP_TOLERANCE_M)
  })

  it('rejects invalid and out-of-area input', () => {
    expect(() => parseCampPositionInput('ZZ 99 99')).toThrow(/outside/i)
    expect(() => parseCampPositionInput('not a reference')).toThrow(/grid reference/i)
    expect(() => parseCampPositionInput('0, 0')).toThrow(/outside/i)
  })

  it('round-trips known points within documented tolerance', () => {
    const osgbCases = [
      { easting: 651_409, northing: 313_177 },
      { easting: 530_300, northing: 180_800 },
    ]
    for (const sample of osgbCases) {
      const metres = gridRoundTripMetres('osgb', sample.easting, sample.northing)
      expect(metres).toBeLessThanOrEqual(GRID_ROUND_TRIP_TOLERANCE_M)
    }

    const irishCases = [{ easting: 315_944, northing: 233_410 }]
    for (const sample of irishCases) {
      const metres = gridRoundTripMetres('irish', sample.easting, sample.northing)
      expect(metres).toBeLessThanOrEqual(GRID_ROUND_TRIP_TOLERANCE_M)
    }
  })

  it('round-trips through parse and grid format within tolerance', () => {
    const parsed = parseCampPositionInput('TG 51409 13177')
    const formatted = formatCampGridReference(parsed.latitude, parsed.longitude, 10)
    const reparsed = parseCampPositionInput(formatted!.gridReference)
    const metres = distanceMetres(parsed, reparsed)
    expect(metres).toBeLessThanOrEqual(GRID_ROUND_TRIP_TOLERANCE_M)
  })
})