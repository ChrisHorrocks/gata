import type { MapConfig } from '@/config/map'

/** HTTP URL of the self-hosted elevation PMTiles archive (range requests via /tiles). */
export function elevationPmtilesArchiveUrl(
  config: MapConfig,
  origin = 'http://localhost',
): string {
  const path = config.elevationPmtilesPath.startsWith('/')
    ? config.elevationPmtilesPath
    : `/${config.elevationPmtilesPath}`
  return new URL(path, origin).href
}

/** Virtual tile URL pattern for maplibre-contour; tiles are loaded via PMTiles.getZxy, not GET. */
export function elevationDemTilePattern(
  config: MapConfig,
  origin = 'http://localhost',
): string {
  return `${elevationPmtilesArchiveUrl(config, origin)}/{z}/{x}/{y}.webp`
}