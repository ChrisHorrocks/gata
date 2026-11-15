import type { BasemapsAssetsFontStack } from '@/lib/basemapsAssetsFonts'

/** Closest available weight to bold in vendored basemaps-assets (no Noto Sans Bold). */
export const CONTOUR_LABEL_FONT: BasemapsAssetsFontStack[] = ['Noto Sans Medium']

/** Gata-owned symbol layers' text-font stacks (excludes @protomaps/basemaps). */
export const GATA_MAP_TEXT_FONT_STACKS: string[][] = [CONTOUR_LABEL_FONT]