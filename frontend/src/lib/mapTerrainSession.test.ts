import { afterEach, describe, expect, it } from 'vitest'

import {
  readTerrainLayerPrefs,
  terrainAttributionVisible,
  writeTerrainLayerPrefs,
} from '@/lib/mapTerrainSession'

describe('mapTerrainSession', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('defaults both terrain layers off', () => {
    expect(readTerrainLayerPrefs()).toEqual({ hillshade: false, contours: false })
  })

  it('persists toggles for the session', () => {
    writeTerrainLayerPrefs({ hillshade: true, contours: false })
    expect(readTerrainLayerPrefs()).toEqual({ hillshade: true, contours: false })

    writeTerrainLayerPrefs({ hillshade: false, contours: true })
    expect(readTerrainLayerPrefs()).toEqual({ hillshade: false, contours: true })
  })

  it('shows Mapterhorn credit when either terrain layer is on', () => {
    expect(terrainAttributionVisible({ hillshade: false, contours: false })).toBe(
      false,
    )
    expect(terrainAttributionVisible({ hillshade: true, contours: false })).toBe(
      true,
    )
    expect(terrainAttributionVisible({ hillshade: false, contours: true })).toBe(
      true,
    )
  })
})