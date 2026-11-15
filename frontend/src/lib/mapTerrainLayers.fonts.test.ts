import { describe, expect, it } from 'vitest'

import { BASEMAPS_ASSETS_FONT_STACKS } from '@/lib/basemapsAssetsFonts'
import { GATA_MAP_TEXT_FONT_STACKS } from '@/lib/mapTerrainLayerFonts'

describe('Gata map text-font stacks', () => {
  it('uses only fonts shipped in vendored basemaps-assets', () => {
    const allowed = new Set<string>(BASEMAPS_ASSETS_FONT_STACKS)
    const used = GATA_MAP_TEXT_FONT_STACKS.flat()

    for (const font of used) {
      expect(allowed.has(font), `unknown basemaps font stack: ${font}`).toBe(true)
    }
  })
})