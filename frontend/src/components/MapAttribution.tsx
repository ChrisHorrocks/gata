import type { MapConfig } from '@/config/map'

type MapAttributionProps = {
  config: MapConfig
  terrainAttributionVisible: boolean
}

export function MapAttribution({
  config,
  terrainAttributionVisible,
}: MapAttributionProps) {
  return (
    <div
      className="pointer-events-auto absolute bottom-2 right-2 flex flex-wrap justify-end gap-x-2 rounded bg-white/90 px-2 py-1 text-xs text-neutral-800 shadow"
      data-testid="map-attribution"
    >
      <a
        href={config.attributionUrl}
        rel="noopener noreferrer"
        target="_blank"
        className="underline"
      >
        {config.attributionLabel}
      </a>
      {terrainAttributionVisible ? (
        <a
          href={config.terrainAttributionUrl}
          rel="noopener noreferrer"
          target="_blank"
          className="underline"
        >
          {config.terrainAttributionLabel}
        </a>
      ) : null}
    </div>
  )
}