import type { MapConfig } from '@/config/map'

const MAPTERHORN_ATTRIBUTION_URL = 'https://mapterhorn.com/attribution'

type MapAttributionProps = {
  config: MapConfig
  hillshadeOn: boolean
  contoursOn: boolean
}

export function MapAttribution({
  config,
  hillshadeOn,
  contoursOn,
}: MapAttributionProps) {
  const showMapterhorn = hillshadeOn || contoursOn

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
      {showMapterhorn ? (
        <>
          {' · '}
          <a
            href={MAPTERHORN_ATTRIBUTION_URL}
            rel="noopener noreferrer"
            target="_blank"
            className="underline"
          >
            © Mapterhorn
          </a>
        </>
      ) : null}
    </div>
  )
}