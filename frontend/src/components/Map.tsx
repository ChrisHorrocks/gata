import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { Protocol } from 'pmtiles'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

maplibregl.setWorkerUrl(maplibreWorker)

import { getMapConfig } from '@/config/map'
import { MapAttribution } from '@/components/MapAttribution'
import { MapTerrainControls } from '@/components/MapTerrainControls'
import {
  applyTerrainLayerVisibility,
  ensureTerrainProtocols,
  installTerrainLayers,
} from '@/lib/mapTerrainLayers'
import {
  readTerrainLayerPrefs,
  terrainAttributionVisible,
  type TerrainLayerPrefs,
} from '@/lib/mapTerrainSession'
import { buildMapStyle } from '@/lib/mapStyle'
import { cn } from '@/lib/utils'

export type MapClickCoords = { latitude: number; longitude: number }

type MapProps = {
  className?: string
  config?: ReturnType<typeof getMapConfig>
  onMapClick?: (coords: MapClickCoords) => void
  onMapReady?: (map: maplibregl.Map) => void
  flyTo?: { latitude: number; longitude: number; token: number } | null
}

export function Map({
  className,
  config: configProp,
  onMapClick,
  onMapReady,
  flyTo,
}: MapProps) {
  const config = useMemo(
    () => configProp ?? getMapConfig(),
    [configProp],
  )
  const shellRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const terrainReadyRef = useRef(false)
  const onMapClickRef = useRef(onMapClick)
  const onMapReadyRef = useRef(onMapReady)
  useEffect(() => {
    onMapClickRef.current = onMapClick
    onMapReadyRef.current = onMapReady
  }, [onMapClick, onMapReady])
  const [terrainPrefs, setTerrainPrefs] = useState<TerrainLayerPrefs>(() =>
    readTerrainLayerPrefs(),
  )

  const syncTerrainLayers = useCallback(
    (map: maplibregl.Map, prefs: TerrainLayerPrefs) => {
      if (!terrainReadyRef.current) return
      applyTerrainLayerVisibility(map, prefs.hillshade, prefs.contours)
    },
    [],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const origin = window.location.origin
    const demSource = ensureTerrainProtocols(maplibregl, config, origin)

    const map = new maplibregl.Map({
      container,
      style: buildMapStyle(config, origin),
      center: config.defaultCenter,
      zoom: config.defaultZoom,
      attributionControl: false,
    })
    map.on('load', () => {
      installTerrainLayers(map, demSource)
      terrainReadyRef.current = true
      syncTerrainLayers(map, readTerrainLayerPrefs())
      map.resize()
      onMapReadyRef.current?.(map)
    })
    map.on('click', (event) => {
      onMapClickRef.current?.({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      })
    })
    mapRef.current = map

    const shell = shellRef.current
    const resizeObserver =
      shell &&
      new ResizeObserver(() => {
        map.resize()
      })
    if (resizeObserver && shell) resizeObserver.observe(shell)

    return () => {
      resizeObserver?.disconnect()
      terrainReadyRef.current = false
      map.remove()
      mapRef.current = null
      maplibregl.removeProtocol('pmtiles')
    }
  }, [config, syncTerrainLayers])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    syncTerrainLayers(map, terrainPrefs)
  }, [terrainPrefs, syncTerrainLayers])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !flyTo) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.easeTo({
      center: [flyTo.longitude, flyTo.latitude],
      duration: reduceMotion ? 0 : 600,
    })
  }, [flyTo])

  return (
    <div
      ref={shellRef}
      className={cn('relative h-full min-h-0 w-full', className)}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 min-h-0 min-w-0 [&_.maplibregl-canvas]:block"
        data-testid="maplibre-container"
        aria-label="Trip map"
      />
      <MapTerrainControls value={terrainPrefs} onChange={setTerrainPrefs} />
      <MapAttribution
        config={config}
        terrainAttributionVisible={terrainAttributionVisible(terrainPrefs)}
      />
    </div>
  )
}