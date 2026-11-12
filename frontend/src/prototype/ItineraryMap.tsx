/**
 * MapLibre camp pins + approximate dashed connector (#6 prototype)
 */
import * as maplibregl from 'maplibre-gl'
import type { Map, MapMouseEvent } from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import type { Camp, Day } from './types'

const STYLE_URL = 'https://demotiles.maplibre.org/style.json'

interface ItineraryMapProps {
  days: Day[]
  camps: Camp[]
  selectedDayId: string | null
  onMapClick?: (lat: number, lng: number) => void
  className?: string
  compact?: boolean
}

export function ItineraryMap({ days, camps, selectedDayId, onMapClick, className, compact }: ItineraryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [-2.0, 53.59],
      zoom: compact ? 10.5 : 11.2,
      attributionControl: {},
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right')
    mapRef.current = map

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [compact])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const points: Array<{ dayIndex: number; camp: Camp; dayId: string }> = []
    days.forEach((day, dayIndex) => {
      if (!day.campId) return
      const camp = camps.find((c) => c.id === day.campId)
      if (!camp) return
      points.push({ dayIndex, camp, dayId: day.id })
    })

    const syncLayers = () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      const lineCoords = points.map((p) => [p.camp.lng, p.camp.lat] as [number, number])

      if (map.getSource('approx-route')) {
        ;(map.getSource('approx-route') as maplibregl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: lineCoords },
        })
      } else {
        map.addSource('approx-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: lineCoords },
          },
        })
        map.addLayer({
          id: 'approx-route-line',
          type: 'line',
          source: 'approx-route',
          paint: {
            'line-color': '#6b7280',
            'line-width': 2,
            'line-dasharray': [2, 2],
            'line-opacity': 0.55,
          },
        })
      }

      points.forEach(({ dayIndex, camp, dayId }) => {
        const el = document.createElement('div')
        const selected = dayId === selectedDayId
        el.className = `flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md ${
          selected ? 'border-primary bg-primary text-white scale-110' : 'border-white bg-card text-foreground'
        }`
        el.textContent = String(dayIndex + 1)
        el.title = camp.name

        const marker = new maplibregl.Marker({ element: el }).setLngLat([camp.lng, camp.lat]).addTo(map)
        markersRef.current.push(marker)
      })

      if (lineCoords.length >= 2) {
        const bounds = new maplibregl.LngLatBounds()
        lineCoords.forEach((c) => bounds.extend(c))
        map.fitBounds(bounds, { padding: compact ? 30 : 60, maxZoom: 12, duration: 0 })
      }
    }

    if (map.isStyleLoaded()) syncLayers()
    else map.once('load', syncLayers)
  }, [days, camps, selectedDayId, compact])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !onMapClick) return

    const handler = (e: MapMouseEvent) => {
      onMapClick(e.lngLat.lat, e.lngLat.lng)
    }
    map.getCanvas().style.cursor = 'crosshair'
    map.on('click', handler)
    return () => {
      map.off('click', handler)
      map.getCanvas().style.cursor = ''
    }
  }, [onMapClick])

  return (
    <div className={className}>
      <div ref={containerRef} className="h-full min-h-[200px] w-full rounded-md border" />
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Straight dashed line is approximate · © OpenStreetMap (demo tiles)
      </p>
    </div>
  )
}
