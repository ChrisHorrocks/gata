import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'

import type { CampPin } from '@/lib/campItinerary'
import { campLineCoordinates } from '@/lib/campItinerary'

const POINTS_SOURCE = 'gata-camps-points'
const LINE_SOURCE = 'gata-camps-line'

function ensureCampLayers(map: MapLibreMap): void {
  if (!map.getSource(POINTS_SOURCE)) {
    map.addSource(POINTS_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!map.getSource(LINE_SOURCE)) {
    map.addSource(LINE_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!map.getLayer('gata-camps-line')) {
    map.addLayer({
      id: 'gata-camps-line',
      type: 'line',
      source: LINE_SOURCE,
      paint: {
        'line-color': '#64748b',
        'line-width': 2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.55,
      },
    })
  }
  if (!map.getLayer('gata-camps-pins')) {
    map.addLayer({
      id: 'gata-camps-pins',
      type: 'circle',
      source: POINTS_SOURCE,
      paint: {
        'circle-radius': 12,
        'circle-color': '#1d4ed8',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })
  }
  if (!map.getLayer('gata-camps-labels')) {
    map.addLayer({
      id: 'gata-camps-labels',
      type: 'symbol',
      source: POINTS_SOURCE,
      layout: {
        'text-field': ['get', 'pin'],
        'text-size': 12,
        'text-font': ['Noto Sans Medium'],
      },
      paint: {
        'text-color': '#ffffff',
      },
    })
  }
  if (!map.getLayer('gata-camps-approx-label')) {
    map.addLayer({
      id: 'gata-camps-approx-label',
      type: 'symbol',
      source: LINE_SOURCE,
      layout: {
        'symbol-placement': 'line-center',
        'text-field': 'approximate',
        'text-size': 11,
        'text-font': ['Noto Sans Medium'],
      },
      paint: {
        'text-color': '#64748b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1,
      },
    })
  }
}

export function syncCampMapLayers(map: MapLibreMap, pins: CampPin[]): void {
  ensureCampLayers(map)

  const pointFeatures = pins.map((pin) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [pin.longitude, pin.latitude],
    },
    properties: {
      pin: String(pin.pin_number),
      dayId: pin.day_id,
    },
  }))

  const lineCoords = campLineCoordinates(pins)
  const lineFeatures =
    lineCoords.length >= 2
      ? [
          {
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates: lineCoords },
            properties: {},
          },
        ]
      : []

  ;(map.getSource(POINTS_SOURCE) as GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: pointFeatures,
  })
  ;(map.getSource(LINE_SOURCE) as GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: lineFeatures,
  })
}

export function removeCampMapLayers(map: MapLibreMap): void {
  for (const id of [
    'gata-camps-approx-label',
    'gata-camps-labels',
    'gata-camps-pins',
    'gata-camps-line',
  ]) {
    if (map.getLayer(id)) {
      map.removeLayer(id)
    }
  }
  for (const id of [POINTS_SOURCE, LINE_SOURCE]) {
    if (map.getSource(id)) {
      map.removeSource(id)
    }
  }
}