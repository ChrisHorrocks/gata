import type * as maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'

import type { createTerrainDemSource } from '@/lib/terrainDemSource'
import { contourThresholds } from '@/lib/terrainLayers'

export const TERRAIN_SOURCE_IDS = {
  dem: 'gata-terrain-dem',
  contours: 'gata-terrain-contours',
} as const

export const TERRAIN_LAYER_IDS = {
  hillshade: 'gata-hillshade',
  contourLines: 'gata-contour-lines',
  contourLabels: 'gata-contour-labels',
} as const

type TerrainDemSource = ReturnType<typeof createTerrainDemSource>

export function terrainSourcesAndLayers(
  demSource: TerrainDemSource,
): Pick<StyleSpecification, 'sources' | 'layers'> {
  return {
    sources: {
      [TERRAIN_SOURCE_IDS.dem]: {
        type: 'raster-dem',
        encoding: 'terrarium',
        tiles: [demSource.sharedDemProtocolUrl],
        maxzoom: 12,
        tileSize: 512,
      },
      [TERRAIN_SOURCE_IDS.contours]: {
        type: 'vector',
        tiles: [
          demSource.contourProtocolUrl({
            thresholds: contourThresholds,
            elevationKey: 'ele',
            levelKey: 'level',
            contourLayer: 'contours',
            buffer: 1,
            overzoom: 2,
          }),
        ],
        maxzoom: 16,
      },
    },
    layers: [
      {
        id: TERRAIN_LAYER_IDS.hillshade,
        type: 'hillshade',
        source: TERRAIN_SOURCE_IDS.dem,
        layout: { visibility: 'none' },
        paint: {
          'hillshade-method': 'igor',
          'hillshade-exaggeration': 0.35,
          'hillshade-highlight-color': 'rgb(255, 255, 228)',
          'hillshade-shadow-color': 'rgb(114, 124, 131)',
        },
      },
      {
        id: TERRAIN_LAYER_IDS.contourLines,
        type: 'line',
        source: TERRAIN_SOURCE_IDS.contours,
        'source-layer': 'contours',
        layout: {
          visibility: 'none',
          'line-join': 'round',
        },
        paint: {
          'line-color': 'rgb(215, 151, 60)',
          'line-width': ['match', ['get', 'level'], 1, 1.2, 0.6],
        },
      },
      {
        id: TERRAIN_LAYER_IDS.contourLabels,
        type: 'symbol',
        source: TERRAIN_SOURCE_IDS.contours,
        'source-layer': 'contours',
        filter: ['>', ['get', 'level'], 0],
        layout: {
          visibility: 'none',
          'symbol-placement': 'line',
          'text-size': 12,
          'text-field': [
            'concat',
            ['number-format', ['get', 'ele'], { 'min-fraction-digits': 0, 'max-fraction-digits': 0 }],
            'm',
          ],
          'text-font': ['Noto Sans Regular'],
        },
        paint: {
          'text-color': 'rgb(172, 120, 48)',
          'text-halo-color': 'white',
          'text-halo-width': 2,
        },
      },
    ],
  }
}

export function setTerrainLayerVisibility(
  map: maplibregl.Map,
  prefs: { hillshade: boolean; contours: boolean },
): void {
  const hillVis = prefs.hillshade ? 'visible' : 'none'
  const contourVis = prefs.contours ? 'visible' : 'none'
  if (map.getLayer(TERRAIN_LAYER_IDS.hillshade)) {
    map.setLayoutProperty(TERRAIN_LAYER_IDS.hillshade, 'visibility', hillVis)
  }
  if (map.getLayer(TERRAIN_LAYER_IDS.contourLines)) {
    map.setLayoutProperty(TERRAIN_LAYER_IDS.contourLines, 'visibility', contourVis)
  }
  if (map.getLayer(TERRAIN_LAYER_IDS.contourLabels)) {
    map.setLayoutProperty(
      TERRAIN_LAYER_IDS.contourLabels,
      'visibility',
      contourVis,
    )
  }
}