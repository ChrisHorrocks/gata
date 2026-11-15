import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { Protocol } from 'pmtiles'
import { useEffect, useMemo, useRef } from 'react'

maplibregl.setWorkerUrl(maplibreWorker)

import { getMapConfig } from '@/config/map'
import { MapAttribution } from '@/components/MapAttribution'
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

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const origin = window.location.origin
    const map = new maplibregl.Map({
      container,
      style: buildMapStyle(config, origin),
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
      <MapAttribution config={config} />
    </div>
  )
}