import mlcontour from 'maplibre-contour'
import { PMTiles } from 'pmtiles'

/** DEM + contour protocol source that reads Terrarium tiles from a self-hosted PMTiles file (HTTP range requests). */
export function createTerrainDemSource(pmtilesAbsoluteUrl: string) {
  const archive = new PMTiles(pmtilesAbsoluteUrl)
  const demSource = new mlcontour.DemSource({
    url: 'https://gata.invalid/{z}/{x}/{y}.webp',
    encoding: 'terrarium',
    maxzoom: 12,
    worker: false,
    id: 'gata-terrain',
    cacheSize: 64,
  })
  const manager = new mlcontour.LocalDemManager({
    demUrlPattern: 'gata-terrain://{z}/{x}/{y}',
    encoding: 'terrarium',
    maxzoom: 12,
    cacheSize: 64,
    timeoutMs: 15_000,
    getTile: async (url, abortController) => {
      const match = /\/\/(\d+)\/(\d+)\/(\d+)/.exec(url)
      if (!match) {
        throw new Error(`Invalid terrain tile URL: ${url}`)
      }
      const z = Number(match[1])
      const x = Number(match[2])
      const y = Number(match[3])
      const tile = await archive.getZxy(z, x, y, abortController.signal)
      if (!tile) {
        throw new Error(`Terrain tile missing at z=${z} x=${x} y=${y}`)
      }
      return {
        data: new Blob([tile.data], { type: 'image/webp' }),
      }
    },
  })
  // shortcut: replace default HTTP fetch manager so one PMTiles file serves contours and hillshade
  ;(demSource as unknown as { manager: typeof manager }).manager = manager
  return demSource
}