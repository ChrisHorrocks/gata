/** Session-persisted hillshade and contour toggles. */

const STORAGE_KEY = 'gata.map.terrain-layers'

export type TerrainLayerPrefs = {
  hillshade: boolean
  contours: boolean
}

const DEFAULT_PREFS: TerrainLayerPrefs = {
  hillshade: false,
  contours: false,
}

export function readTerrainLayerPrefs(): TerrainLayerPrefs {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<TerrainLayerPrefs>
    return {
      hillshade: Boolean(parsed.hillshade),
      contours: Boolean(parsed.contours),
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function writeTerrainLayerPrefs(prefs: TerrainLayerPrefs): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

/**
 * OS Explorer–style contour intervals (meters). Major/index every 50 m; 10 m elsewhere.
 * 5 m minors at z15+ — kept after Snowdonia check on Mapterhorn z0–12 (overzoom via maplibre-contour).
 */
export const contourThresholds: Record<number, number[]> = {
  11: [20, 100],
  12: [10, 50],
  13: [10, 50],
  14: [10, 50],
  15: [5, 50],
  16: [5, 50],
}