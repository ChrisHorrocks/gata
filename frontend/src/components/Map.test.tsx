import { describe, expect, it } from 'vitest'

import { getMapConfig, pmtilesAbsoluteUrl } from '@/config/map'
import { buildMapStyle, styleIncludesLandcover } from '@/lib/mapStyle'

describe('map configuration', () => {
  it('reads tile URL and attribution from configuration', () => {
    const config = getMapConfig({
      pmtilesPath: '/tiles/britain-ireland.pmtiles',
      elevationPmtilesPath: '/tiles/britain-ireland-elevation.pmtiles',
      assetsPrefix: '/tiles/basemaps-assets',
      attributionLabel: '© OpenStreetMap',
      attributionUrl: 'https://www.openstreetmap.org/copyright',
    })

    expect(pmtilesAbsoluteUrl(config, 'http://localhost:5173')).toBe(
      'http://localhost:5173/tiles/britain-ireland.pmtiles',
    )
    expect(config.attributionLabel).toBe('© OpenStreetMap')
    expect(config.attributionUrl).toBe(
      'https://www.openstreetmap.org/copyright',
    )
  })

  it('builds a Protomaps style with local assets and landcover off', () => {
    const config = getMapConfig({
      pmtilesPath: '/tiles/dev-small.pmtiles',
      assetsPrefix: '/tiles/basemaps-assets',
    })
    const style = buildMapStyle(config, 'http://localhost:5173')

    const source = style.sources?.protomaps
    expect(source && 'url' in source && source.url).toBe(
      'pmtiles://http://localhost:5173/tiles/dev-small.pmtiles',
    )
    expect(style.glyphs).toBe(
      'http://localhost:5173/tiles/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    )
    expect(style.sprite).toBe(
      'http://localhost:5173/tiles/basemaps-assets/sprites/v4/light',
    )
    expect(styleIncludesLandcover(style)).toBe(false)
    expect(style.glyphs).not.toContain('protomaps.github.io')
    expect(style.sprite).not.toContain('protomaps.github.io')
  })
})