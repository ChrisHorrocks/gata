import mlcontour from 'maplibre-contour'
import type { Map as MapLibreMap } from 'maplibre-gl'

import type { MapConfig } from '@/config/map'
import { CONTOUR_THRESHOLDS } from '@/lib/contourStyle'
import { CONTOUR_LABEL_FONT } from '@/lib/mapTerrainLayerFonts'
import { createElevationDemGetTile } from '@/lib/elevationDemGetTile'
import {
  elevationDemTilePattern,
  elevationPmtilesArchiveUrl,
} from '@/lib/elevationDemUrl'

const DEM_SOURCE_ID = 'gata-elevation-dem'
const CONTOUR_SOURCE_ID = 'gata-contour-source'
const HILLSHADE_LAYER_ID = 'gata-hillshade'
const CONTOUR_LINES_LAYER_ID = 'gata-contour-lines'
const CONTOUR_LABELS_LAYER_ID = 'gata-contour-labels'

const ELEVATION_MAX_ZOOM = 12

type DemSource = InstanceType<typeof mlcontour.DemSource>
type LocalDemManager = InstanceType<typeof mlcontour.LocalDemManager>

let demSource: DemSource | null = null

export function ensureTerrainProtocols(
  maplibregl: typeof import('maplibre-gl'),
  config: MapConfig,
  origin: string,
): DemSource {
  if (!demSource) {
    const archiveUrl = elevationPmtilesArchiveUrl(config, origin)
    demSource = new mlcontour.DemSource({
      url: elevationDemTilePattern(config, origin),
      encoding: 'terrarium',
      maxzoom: ELEVATION_MAX_ZOOM,
      // getTile cannot run in maplibre-contour's shared worker (not serializable); PMTiles runs on main thread.
      worker: false,
      id: 'gata-dem',
    })
    const manager = demSource.manager as LocalDemManager
    manager.getTile = createElevationDemGetTile(archiveUrl)
    demSource.setupMaplibre(maplibregl)
  }
  return demSource
}

function addTerrainSources(map: MapLibreMap, source: DemSource): void {
  if (!map.getSource(DEM_SOURCE_ID)) {
    map.addSource(DEM_SOURCE_ID, {
      type: 'raster-dem',
      encoding: 'terrarium',
      tiles: [source.sharedDemProtocolUrl],
      maxzoom: ELEVATION_MAX_ZOOM,
      tileSize: 512,
    })
  }
  if (!map.getSource(CONTOUR_SOURCE_ID)) {
    map.addSource(CONTOUR_SOURCE_ID, {
      type: 'vector',
      tiles: [
        source.contourProtocolUrl({
          thresholds: CONTOUR_THRESHOLDS,
          multiplier: 1,
          contourLayer: 'contours',
          elevationKey: 'ele',
          levelKey: 'level',
        }),
      ],
      maxzoom: 15,
    })
  }
}

function addTerrainLayerDefinitions(map: MapLibreMap): void {
  if (!map.getLayer(HILLSHADE_LAYER_ID)) {
    map.addLayer({
      id: HILLSHADE_LAYER_ID,
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      paint: {
        'hillshade-exaggeration': 0.35,
      },
      layout: { visibility: 'none' },
    })
  }
  if (!map.getLayer(CONTOUR_LINES_LAYER_ID)) {
    map.addLayer({
      id: CONTOUR_LINES_LAYER_ID,
      type: 'line',
      source: CONTOUR_SOURCE_ID,
      'source-layer': 'contours',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#6b5b4a',
        'line-width': ['match', ['get', 'level'], 1, 1.25, 0.6],
        'line-opacity': 0.75,
      },
    })
  }
  if (!map.getLayer(CONTOUR_LABELS_LAYER_ID)) {
    map.addLayer({
      id: CONTOUR_LABELS_LAYER_ID,
      type: 'symbol',
      source: CONTOUR_SOURCE_ID,
      'source-layer': 'contours',
      filter: ['>', ['get', 'level'], 0],
      layout: {
        visibility: 'none',
        'symbol-placement': 'line',
        'text-size': 11,
        'text-field': [
          'concat',
          ['number-format', ['get', 'ele'], { 'max-fraction-digits': 0 }],
          'm',
        ],
        'text-font': CONTOUR_LABEL_FONT,
      },
      paint: {
        'text-color': '#4a3f35',
        'text-halo-color': 'rgba(255,255,255,0.85)',
        'text-halo-width': 1.5,
      },
    })
  }
}

export function installTerrainLayers(map: MapLibreMap, dem: DemSource): void {
  addTerrainSources(map, dem)
  addTerrainLayerDefinitions(map)
}

export function applyTerrainLayerVisibility(
  map: MapLibreMap,
  hillshade: boolean,
  contours: boolean,
): void {
  const hillVis = hillshade ? 'visible' : 'none'
  const contourVis = contours ? 'visible' : 'none'
  if (map.getLayer(HILLSHADE_LAYER_ID)) {
    map.setLayoutProperty(HILLSHADE_LAYER_ID, 'visibility', hillVis)
  }
  if (map.getLayer(CONTOUR_LINES_LAYER_ID)) {
    map.setLayoutProperty(CONTOUR_LINES_LAYER_ID, 'visibility', contourVis)
  }
  if (map.getLayer(CONTOUR_LABELS_LAYER_ID)) {
    map.setLayoutProperty(CONTOUR_LABELS_LAYER_ID, 'visibility', contourVis)
  }
}

/** @internal test hook */
export function resetTerrainDemSourceForTests(): void {
  demSource = null
}