const HILLSHADE_KEY = 'gata.map.hillshade'
const CONTOURS_KEY = 'gata.map.contours'

export type TerrainLayerPrefs = {
  hillshade: boolean
  contours: boolean
}

const DEFAULT_PREFS: TerrainLayerPrefs = {
  hillshade: false,
  contours: false,
}

function readBool(key: string): boolean | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) return null
    if (raw === '1' || raw === 'true') return true
    if (raw === '0' || raw === 'false') return false
    return null
  } catch {
    return null
  }
}

function writeBool(key: string, value: boolean): void {
  try {
    sessionStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* sessionStorage may be unavailable in restricted contexts */
  }
}

export function readTerrainLayerPrefs(): TerrainLayerPrefs {
  const hillshade = readBool(HILLSHADE_KEY)
  const contours = readBool(CONTOURS_KEY)
  return {
    hillshade: hillshade ?? DEFAULT_PREFS.hillshade,
    contours: contours ?? DEFAULT_PREFS.contours,
  }
}

export function writeTerrainLayerPrefs(prefs: TerrainLayerPrefs): void {
  writeBool(HILLSHADE_KEY, prefs.hillshade)
  writeBool(CONTOURS_KEY, prefs.contours)
}

export function terrainAttributionVisible(prefs: TerrainLayerPrefs): boolean {
  return prefs.hillshade || prefs.contours
}