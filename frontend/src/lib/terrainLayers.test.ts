import { afterEach, describe, expect, it } from 'vitest'

import {
  contourThresholds,
  readTerrainLayerPrefs,
  writeTerrainLayerPrefs,
} from '@/lib/terrainLayers'

describe('terrain layer session prefs', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('defaults both layers off when nothing stored', () => {
    expect(readTerrainLayerPrefs()).toEqual({
      hillshade: false,
      contours: false,
    })
  })

  it('persists hillshade and contour toggles for the session', () => {
    writeTerrainLayerPrefs({ hillshade: true, contours: false })
    expect(readTerrainLayerPrefs()).toEqual({
      hillshade: true,
      contours: false,
    })
    writeTerrainLayerPrefs({ hillshade: true, contours: true })
    expect(readTerrainLayerPrefs()).toEqual({
      hillshade: true,
      contours: true,
    })
  })
})

describe('contour thresholds', () => {
  it('uses 10 m minor and 50 m index lines (OS Explorer style)', () => {
    expect(contourThresholds[12]).toEqual([10, 50])
    expect(contourThresholds[14]).toEqual([10, 50])
  })

  it('adds 5 m minor lines only at zoom 15+', () => {
    expect(contourThresholds[15]).toEqual([5, 50])
    expect(contourThresholds[16]).toEqual([5, 50])
  })
})