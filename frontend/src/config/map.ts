/** Map tile and attribution configuration (from environment; never hotlink build.protomaps.com). */

export type MapConfig = {
  /** URL path on the app origin, e.g. /tiles/dev-small.pmtiles */
  pmtilesPath: string
  /** Prefix path for vendored basemaps-assets, e.g. /basemaps-assets */
  assetsPrefix: string
  /** Visible attribution label (always includes OpenStreetMap). */
  attributionLabel: string
  /** OpenStreetMap copyright page. */
  attributionUrl: string
  defaultCenter: [number, number]
  defaultZoom: number
}

const DEFAULT_PMTILES_PATH =
  import.meta.env.VITE_MAP_PMTILES_PATH ?? '/tiles/dev-small.pmtiles'
const DEFAULT_ASSETS_PREFIX =
  import.meta.env.VITE_MAP_ASSETS_PREFIX ?? '/tiles/basemaps-assets'
const DEFAULT_ATTRIBUTION_URL =
  import.meta.env.VITE_MAP_ATTRIBUTION_URL ??
  'https://www.openstreetmap.org/copyright'

export function getMapConfig(
  overrides: Partial<MapConfig> = {},
): MapConfig {
  return {
    pmtilesPath: overrides.pmtilesPath ?? DEFAULT_PMTILES_PATH,
    assetsPrefix: overrides.assetsPrefix ?? DEFAULT_ASSETS_PREFIX,
    attributionLabel: overrides.attributionLabel ?? '© OpenStreetMap',
    attributionUrl: overrides.attributionUrl ?? DEFAULT_ATTRIBUTION_URL,
    defaultCenter: overrides.defaultCenter ?? [-3.95, 53.05],
    defaultZoom: overrides.defaultZoom ?? 9,
  }
}

/** Absolute PMTiles URL for the pmtiles:// protocol (same origin as the SPA). */
export function pmtilesAbsoluteUrl(
  config: MapConfig,
  origin = 'http://localhost',
): string {
  const path = config.pmtilesPath.startsWith('/')
    ? config.pmtilesPath
    : `/${config.pmtilesPath}`
  return `${origin.replace(/\/$/, '')}${path}`
}