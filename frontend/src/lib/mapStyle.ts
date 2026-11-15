import type { StyleSpecification } from 'maplibre-gl'
import { layers, namedFlavor } from '@protomaps/basemaps'

import type { MapConfig } from '@/config/map'
import { pmtilesAbsoluteUrl } from '@/config/map'

function absoluteAssetUrl(
  config: MapConfig,
  origin: string,
  suffix: string,
): string {
  const base = origin.replace(/\/$/, '')
  const prefix = config.assetsPrefix.replace(/\/$/, '')
  const path = suffix.startsWith('/') ? suffix : `/${suffix}`
  return `${base}${prefix}${path}`
}

export function buildMapStyle(
  config: MapConfig,
  origin: string,
): StyleSpecification {
  const tileUrl = pmtilesAbsoluteUrl(config, origin)

  return {
    version: 8,
    glyphs: absoluteAssetUrl(config, origin, '/fonts/{fontstack}/{range}.pbf'),
    sprite: absoluteAssetUrl(config, origin, '/sprites/v4/light'),
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${tileUrl}`,
      },
    },
    layers: layers('protomaps', namedFlavor('light'), { lang: 'en' }).filter(
      (layer) =>
        !('source-layer' in layer && layer['source-layer'] === 'landcover'),
    ),
  }
}

export function styleIncludesLandcover(style: StyleSpecification): boolean {
  return (style.layers ?? []).some(
    (layer) =>
      'source-layer' in layer &&
      layer['source-layer'] === 'landcover',
  )
}