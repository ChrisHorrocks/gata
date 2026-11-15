/** Vendored protomaps/basemaps-assets font stacks (see scripts/tiles/fetch-basemaps-assets.sh). */
export const BASEMAPS_ASSETS_FONT_STACKS = [
  'Noto Sans Regular',
  'Noto Sans Medium',
  'Noto Sans Italic',
  'Noto Sans Devanagari Regular v1',
] as const

export type BasemapsAssetsFontStack = (typeof BASEMAPS_ASSETS_FONT_STACKS)[number]

export function isBasemapsAssetsFontStack(
  font: string,
): font is BasemapsAssetsFontStack {
  return (BASEMAPS_ASSETS_FONT_STACKS as readonly string[]).includes(font)
}