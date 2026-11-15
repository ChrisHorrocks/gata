import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createElevationDemGetTile,
  parseElevationDemTileUrl,
  resetElevationDemArchivesForTests,
} from '@/lib/elevationDemGetTile'

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

  it('rejects malformed tile URLs', async () => {
    const getTile = createElevationDemGetTile(
      'http://localhost:5173/tiles/dev-elevation.pmtiles',
    )
    await expect(
      getTile('http://localhost:5173/tiles/bad', new AbortController()),
    ).rejects.toThrow(/Not an elevation DEM tile URL/)
  })
})