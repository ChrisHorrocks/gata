import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { Protocol } from 'pmtiles'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

maplibregl.setWorkerUrl(maplibreWorker)

import { getMapConfig, pmtilesAbsoluteUrl } from '@/config/map'
import { MapAttribution } from '@/components/MapAttribution'
import { MapTerrainControls } from '@/components/MapTerrainControls'
import { buildMapStyle } from '@/lib/mapStyle'
import { createTerrainDemSource } from '@/lib/terrainDemSource'
import {
  readTerrainLayerPrefs,
  writeTerrainLayerPrefs,
  type TerrainLayerPrefs,
} from '@/lib/terrainLayers'
import {
  setTerrainLayerVisibility,
  terrainSourcesAndLayers,
} from '@/lib/terrainMapLayers'
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
  const [layerPrefs, setLayerPrefs] = useState<TerrainLayerPrefs>(() =>
    readTerrainLayerPrefs(),
  )

  const applyTerrainVisibility = useCallback(
    (prefs: TerrainLayerPrefs) => {
      const map = mapRef.current
      if (!map || !map.getLayer('gata-hillshade')) return
      setTerrainLayerVisibility(map, prefs)
    },
    [],
  )

  const handleTerrainChange = useCallback(
    (prefs: TerrainLayerPrefs) => {
      writeTerrainLayerPrefs(prefs)
      setLayerPrefs(prefs)
      applyTerrainVisibility(prefs)
    },
    [applyTerrainVisibility],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const origin = window.location.origin
    const elevationUrl = pmtilesAbsoluteUrl(
      { ...config, pmtilesPath: config.elevationPmtilesPath },
      origin,
    )
    const demSource = createTerrainDemSource(elevationUrl)
    demSource.setupMaplibre(maplibregl)

    const initialPrefs = readTerrainLayerPrefs()
    const terrainExtras = terrainSourcesAndLayers(demSource)
    for (const layer of terrainExtras.layers ?? []) {
      if (layer.layout?.visibility === 'none') {
        if (layer.id === 'gata-hillshade' && initialPrefs.hillshade) {
          layer.layout = { ...layer.layout, visibility: 'visible' }
        }
        if (
          (layer.id === 'gata-contour-lines' ||
            layer.id === 'gata-contour-labels') &&
          initialPrefs.contours
        ) {
          layer.layout = { ...layer.layout, visibility: 'visible' }
        }
      }
    }

    const baseStyle = buildMapStyle(config, origin)
    const map = new maplibregl.Map({
      container,
      style: {
        ...baseStyle,
        sources: { ...baseStyle.sources, ...terrainExtras.sources },
        layers: [...(baseStyle.layers ?? []), ...(terrainExtras.layers ?? [])],
      },
      center: config.defaultCenter,
      zoom: config.defaultZoom,
      attributionControl: false,
    })
    map.on('load', () => {
      map.resize()
    })
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      maplibregl.removeProtocol('pmtiles')
    }
  }, [config])

  return (
    <div className={cn('relative h-full min-h-[320px] w-full', className)}>
      <div
        ref={containerRef}
        className="h-full w-full"
        data-testid="maplibre-container"
        aria-label="Trip map"
      />
      <MapTerrainControls
        hillshadeOn={layerPrefs.hillshade}
        contoursOn={layerPrefs.contours}
        onChange={handleTerrainChange}
      />
      <MapAttribution
        config={config}
        hillshadeOn={layerPrefs.hillshade}
        contoursOn={layerPrefs.contours}
      />
    </div>
  )
}