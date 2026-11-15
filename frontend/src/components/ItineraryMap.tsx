import type { Map as MapLibreMap } from 'maplibre-gl'
import { useEffect, useRef } from 'react'

import { Map, type MapClickCoords } from '@/components/Map'
import type { CampPin } from '@/lib/campItinerary'
import { removeCampMapLayers, syncCampMapLayers } from '@/lib/campMapLayers'

type ItineraryMapProps = {
  pins: CampPin[]
  onMapClick: (coords: MapClickCoords) => void
  flyTo?: { latitude: number; longitude: number; token: number } | null
}

export function ItineraryMap({ pins, onMapClick, flyTo }: ItineraryMapProps) {
  const mapRef = useRef<MapLibreMap | null>(null)

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) {
      return
    }
    syncCampMapLayers(map, pins)
  }, [pins])

  useEffect(
    () => () => {
      const map = mapRef.current
      if (map) {
        removeCampMapLayers(map)
      }
    },
    [],
  )

  return (
    <Map
      className="absolute inset-0"
      onMapClick={onMapClick}
      flyTo={flyTo}
      onMapReady={(map) => {
        mapRef.current = map
        syncCampMapLayers(map, pins)
      }}
    />
  )
}