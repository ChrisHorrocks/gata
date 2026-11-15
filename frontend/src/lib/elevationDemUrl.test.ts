import { describe, expect, it } from 'vitest'

import { getMapConfig } from '@/config/map'
import {
  elevationDemTilePattern,
  elevationPmtilesArchiveUrl,
} from '@/lib/elevationDemUrl'

describe('elevation PMTiles URLs', () => {
  const config = getMapConfig({
    elevationPmtilesPath: '/tiles/dev-elevation.pmtiles',
  })

  it('builds a valid absolute archive URL (no nested pmtiles:// scheme)', () => {
    expect(elevationPmtilesArchiveUrl(config, 'http://localhost:5173')).toBe(
      'http://localhost:5173/tiles/dev-elevation.pmtiles',
    )
  })

  it('uses an HTTP tile pattern for maplibre-contour', () => {
    expect(elevationDemTilePattern(config, 'http://localhost:5173')).toBe(
      'http://localhost:5173/tiles/dev-elevation.pmtiles/{z}/{x}/{y}.webp',
    )
  })

  it('keeps the scheme colon when origin is normalized', () => {
    expect(elevationPmtilesArchiveUrl(config, 'http://localhost:5173/')).toBe(
      'http://localhost:5173/tiles/dev-elevation.pmtiles',
    )
  })
})