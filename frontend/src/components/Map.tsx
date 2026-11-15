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

type MapProps = {
  className?: string
  config?: ReturnType<typeof getMapConfig>
}

export function Map({ className, config: configProp }: MapProps) {
  const config = useMemo(
    () => configProp ?? getMapConfig(),
    [configProp],
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const terrainReadyRef = useRef(false)
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
      if (import.meta.env.VITE_E2E_MAP_HOOK === '1') {
        ;(window as Window & { __gataMap?: maplibregl.Map }).__gataMap = map
      }
    })
    mapRef.current = map

    return () => {
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

  return (
    <div className={cn('relative h-full min-h-[320px] w-full', className)}>
      <div
        ref={containerRef}
        className="h-full w-full"
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