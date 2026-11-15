import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createElevationDemGetTile,
  parseElevationDemTileUrl,
  resetElevationDemArchivesForTests,
} from '@/lib/elevationDemGetTile'
import { flatTerrariumDemTileBlob } from '@/lib/flatTerrariumDemTile'

const getZxy = vi.fn()

vi.mock('pmtiles', () => ({
  PMTiles: vi.fn(function PMTilesMock() {
    return { getZxy }
  }),
}))

describe('createElevationDemGetTile', () => {
  afterEach(() => {
    getZxy.mockReset()
    resetElevationDemArchivesForTests()
  })

  it('parses z/x/y from the virtual tile URL', () => {
    expect(
      parseElevationDemTileUrl(
        'http://localhost:5173/tiles/dev-elevation.pmtiles/9/250/166.webp',
      ),
    ).toEqual({ z: 9, x: 250, y: 166 })
  })

  it('loads DEM bytes via PMTiles.getZxy', async () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer
    getZxy.mockResolvedValue({ data: bytes })

    const getTile = createElevationDemGetTile(
      'http://localhost:5173/tiles/dev-elevation.pmtiles',
    )
    const abort = new AbortController()
    const result = await getTile(
      'http://localhost:5173/tiles/dev-elevation.pmtiles/9/250/166.webp',
      abort,
    )

    expect(getZxy).toHaveBeenCalledWith(9, 250, 166, abort.signal)
    expect(result.data).toBeInstanceOf(Blob)
    expect(result.data.size).toBe(bytes.byteLength)
  })

  it('returns flat sea-level tile when the archive has no tile', async () => {
    getZxy.mockResolvedValue(undefined)

    const getTile = createElevationDemGetTile(
      'http://localhost:5173/tiles/dev-elevation.pmtiles',
    )
    const result = await getTile(
      'http://localhost:5173/tiles/dev-elevation.pmtiles/9/249/166.webp',
      new AbortController(),
    )

    expect(getZxy).toHaveBeenCalledWith(9, 249, 166, expect.any(AbortSignal))
    const flat = flatTerrariumDemTileBlob()
    expect(result.data).toBe(flat)
    expect(result.data.size).toBeGreaterThan(0)
  })

  it('propagates PMTiles errors such as network failures', async () => {
    getZxy.mockRejectedValue(new Error('fetch failed'))

    const getTile = createElevationDemGetTile(
      'http://localhost:5173/tiles/dev-elevation.pmtiles',
    )
    await expect(
      getTile(
        'http://localhost:5173/tiles/dev-elevation.pmtiles/9/249/166.webp',
        new AbortController(),
      ),
    ).rejects.toThrow(/fetch failed/)
  })

  it('rejects malformed tile URLs', async () => {
    const getTile = createElevationDemGetTile(
      'http://localhost:5173/tiles/dev-elevation.pmtiles',
    )
    await expect(
      getTile('http://localhost:5173/tiles/bad', new AbortController()),
    ).rejects.toThrow(/Not an elevation DEM tile URL/)
  })
})