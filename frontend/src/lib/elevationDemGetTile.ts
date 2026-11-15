import { PMTiles } from 'pmtiles'

const DEM_TILE_SUFFIX = /\/(\d+)\/(\d+)\/(\d+)\.webp(?:\?.*)?$/

const archives = new Map<string, PMTiles>()

function archiveFor(url: string): PMTiles {
  let instance = archives.get(url)
  if (!instance) {
    instance = new PMTiles(url)
    archives.set(url, instance)
  }
  return instance
}

/** Parse z/x/y from the virtual DEM tile URL (used by maplibre-contour). */
export function parseElevationDemTileUrl(tileUrl: string): {
  z: number
  x: number
  y: number
} | null {
  const match = DEM_TILE_SUFFIX.exec(tileUrl)
  if (!match) return null
  return {
    z: Number(match[1]),
    x: Number(match[2]),
    y: Number(match[3]),
  }
}

/**
 * maplibre-contour tile loader: range-read Terrarium WebP tiles from a PMTiles archive.
 * Used instead of fetch() so DEM loading works outside MapLibre's pmtiles:// protocol.
 */
export function createElevationDemGetTile(archiveUrl: string) {
  const pmtiles = archiveFor(archiveUrl)

  return async (
    tileUrl: string,
    abortController: AbortController,
  ): Promise<{ data: Blob }> => {
    const coords = parseElevationDemTileUrl(tileUrl)
    if (!coords) {
      throw new Error(`Not an elevation DEM tile URL: ${tileUrl}`)
    }

    const tile = await pmtiles.getZxy(
      coords.z,
      coords.x,
      coords.y,
      abortController.signal,
    )
    if (!tile) {
      throw new Error(`DEM tile missing: ${coords.z}/${coords.x}/${coords.y}`)
    }

    return { data: new Blob([tile.data]) }
  }
}

export function resetElevationDemArchivesForTests(): void {
  archives.clear()
}