import { describe, expect, it } from 'vitest'

import { getMapConfig } from '@/config/map'
import { elevationDemTilePattern } from '@/lib/elevationDemUrl'

describe('elevationDemTilePattern', () => {
  it('points at the self-hosted Mapterhorn PMTiles archive', () => {
    const config = getMapConfig({
      elevationPmtilesPath: '/tiles/dev-elevation.pmtiles',
    })
    expect(elevationDemTilePattern(config, 'http://localhost:5173')).toBe(
      'pmtiles://http://localhost:5173/tiles/dev-elevation.pmtiles/{z}/{x}/{y}.webp',
    )
  })
})