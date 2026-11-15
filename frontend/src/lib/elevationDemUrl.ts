import type { MapConfig } from '@/config/map'
import { pmtilesAbsoluteUrl } from '@/config/map'

/** Terrarium DEM tiles inside a self-hosted Mapterhorn PMTiles archive (512 px WebP). */
export function elevationDemTilePattern(
  config: MapConfig,
  origin = 'http://localhost',
): string {
  const base = pmtilesAbsoluteUrl(
    { ...config, pmtilesPath: config.elevationPmtilesPath },
    origin,
  )
  return `pmtiles://${base}/{z}/{x}/{y}.webp`
}