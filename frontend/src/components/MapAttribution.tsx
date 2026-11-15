import type { MapConfig } from '@/config/map'

type MapAttributionProps = {
  config: MapConfig
}

export function MapAttribution({ config }: MapAttributionProps) {
  return (
    <div
      className="pointer-events-auto absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-xs text-neutral-800 shadow"
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
    </div>
  )
}