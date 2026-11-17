import proj4 from 'proj4'

/** Round-trip and known-point tests use Helmert shifts (~5 m typical without OSTN15). */
export const GRID_ROUND_TRIP_TOLERANCE_M = 5

const WGS84 = 'EPSG:4326'
const OSGB = 'EPSG:27700'
const IRISH = 'EPSG:29903'

proj4.defs(
  OSGB,
  '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.060,0.1502,0.2470,0.8421,-20.4894 +units=m +no_defs',
)
proj4.defs(
  IRISH,
  '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=0.999820 +x_0=200000 +y_0=250000 +ellps=mod_airy +towgs84=482.530,-130.596,564.557,-1.042,-0.214,-0.631,8.15 +units=m +no_defs',
)

export type CampGridSystem = 'osgb' | 'irish'

export type CampPosition = {
  latitude: number
  longitude: number
}

const GRID_SQUARES: string[][] = [
  ['V', 'W', 'X', 'Y', 'Z'],
  ['Q', 'R', 'S', 'T', 'U'],
  ['L', 'M', 'N', 'O', 'P'],
  ['F', 'G', 'H', 'J', 'K'],
  ['A', 'B', 'C', 'D', 'E'],
]

const GRID_LETTER_INDEX: Record<string, [number, number]> = {}
for (let row = 0; row < GRID_SQUARES.length; row += 1) {
  for (let column = 0; column < GRID_SQUARES[row].length; column += 1) {
    GRID_LETTER_INDEX[GRID_SQUARES[row][column]] = [column, row]
  }
}

const OSGB_EASTING_MAX = 700_000
const OSGB_NORTHING_MAX = 1_300_000
const IRISH_EN_MAX = 500_000
const IRISH_NN_MAX = 500_000

function stripSpaces(value: string): string {
  return value.trim().replace(/\s+/g, '')
}

function padGridDigits(part: string): string {
  return part.padEnd(5, '0')
}

function parseNumericPair(input: string): CampPosition | null {
  const match = input.match(
    /^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/,
  )
  if (!match) {
    return null
  }
  const latitude = Number.parseFloat(match[1])
  const longitude = Number.parseFloat(match[2])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null
  }
  return { latitude, longitude }
}

/** OS National Grid letter pair → metres (algorithm per Chris Veness / OS, MIT). */
function osgbGridRefToEN(gridref: string): { easting: number; northing: number } {
  const normalized = stripSpaces(gridref).toUpperCase()
  const letters = normalized.match(/^([A-HJ-Z]{2})(\d+)$/)
  if (!letters) {
    throw new Error('Unrecognised grid reference.')
  }
  const numeric = letters[2]
  if (numeric.length < 2 || numeric.length % 2 !== 0) {
    throw new Error('Grid numbers must be in an even-length group (6, 8 or 10 figures).')
  }

  let l1 = letters[1].charCodeAt(0) - 'A'.charCodeAt(0)
  let l2 = letters[1].charCodeAt(1) - 'A'.charCodeAt(0)
  if (l1 > 7) l1 -= 1
  if (l2 > 7) l2 -= 1

  const e100km = ((l1 - 2) % 5) * 5 + (l2 % 5)
  const n100km = 19 - Math.floor(l1 / 5) * 5 - Math.floor(l2 / 5)

  const half = numeric.length / 2
  const easting = Number.parseInt(padGridDigits(numeric.slice(0, half)), 10) + e100km * 100_000
  const northing = Number.parseInt(padGridDigits(numeric.slice(half)), 10) + n100km * 100_000

  if (easting < 0 || easting > OSGB_EASTING_MAX || northing < 0 || northing > OSGB_NORTHING_MAX) {
    throw new Error('Grid reference is outside the British National Grid.')
  }

  return { easting, northing }
}

function irishGridRefToEN(gridref: string): { easting: number; northing: number } {
  const normalized = stripSpaces(gridref).toUpperCase()
  const letters = normalized.match(/^([A-HJ-Z])(\d+)$/)
  if (!letters) {
    throw new Error('Unrecognised Irish grid reference.')
  }
  const numeric = letters[2]
  if (numeric.length < 2 || numeric.length % 2 !== 0) {
    throw new Error('Grid numbers must be in an even-length group (6, 8 or 10 figures).')
  }
  const index = GRID_LETTER_INDEX[letters[1]]
  if (!index) {
    throw new Error('Invalid Irish grid square letter.')
  }
  const half = numeric.length / 2
  const easting =
    Number.parseInt(padGridDigits(numeric.slice(0, half)), 10) + index[0] * 100_000
  const northing =
    Number.parseInt(padGridDigits(numeric.slice(half)), 10) + index[1] * 100_000

  if (easting < 0 || easting > IRISH_EN_MAX || northing < 0 || northing > IRISH_NN_MAX) {
    throw new Error('Grid reference is outside the Irish Grid.')
  }

  return { easting, northing }
}

function enToOsgbGridRef(easting: number, northing: number, digits = 8): string {
  if (digits % 2 !== 0 || digits < 2 || digits > 10) {
    throw new RangeError('invalid precision')
  }

  const e100km = Math.floor(easting / 100_000)
  const n100km = Math.floor(northing / 100_000)

  let l1 = 19 - n100km - ((19 - n100km) % 5) + Math.floor((e100km + 10) / 5)
  let l2 = ((19 - n100km) * 5) % 25 + (e100km % 5)
  if (l1 > 7) l1 += 1
  if (l2 > 7) l2 += 1
  const letterPair = String.fromCharCode(l1 + 'A'.charCodeAt(0), l2 + 'A'.charCodeAt(0))

  const e = Math.floor((easting % 100_000) / 10 ** (5 - digits / 2))
  const n = Math.floor((northing % 100_000) / 10 ** (5 - digits / 2))

  return `${letterPair} ${e.toString().padStart(digits / 2, '0')} ${n.toString().padStart(digits / 2, '0')}`
}

function enToIrishGridRef(easting: number, northing: number, digits = 8): string {
  const column = Math.floor(easting / 100_000)
  const row = Math.floor(northing / 100_000)
  if (column < 0 || column > 4 || row < 0 || row > 4) {
    throw new Error('Position is outside the Irish Grid.')
  }
  const letter = GRID_SQUARES[row][column]
  const e = Math.floor((easting % 100_000) / 10 ** (5 - digits / 2))
  const n = Math.floor((northing % 100_000) / 10 ** (5 - digits / 2))
  return `${letter} ${e.toString().padStart(digits / 2, '0')} ${n.toString().padStart(digits / 2, '0')}`
}

function projectToGrid(
  system: CampGridSystem,
  latitude: number,
  longitude: number,
): { easting: number; northing: number } {
  const crs = system === 'osgb' ? OSGB : IRISH
  const [easting, northing] = proj4(WGS84, crs, [longitude, latitude])
  return { easting, northing }
}

function gridToWgs84(
  system: CampGridSystem,
  easting: number,
  northing: number,
): CampPosition {
  const crs = system === 'osgb' ? OSGB : IRISH
  const [longitude, latitude] = proj4(crs, WGS84, [easting, northing])
  return { latitude, longitude }
}

function inGreatBritain(latitude: number, longitude: number): boolean {
  return latitude >= 49.5 && latitude <= 61.0 && longitude >= -8.9 && longitude <= 2.1
}

function inIreland(latitude: number, longitude: number): boolean {
  return latitude >= 51.3 && latitude <= 55.6 && longitude >= -10.9 && longitude <= -5.3
}

export function gridSystemForPosition(latitude: number, longitude: number): CampGridSystem | null {
  if (inIreland(latitude, longitude)) {
    const { easting, northing } = projectToGrid('irish', latitude, longitude)
    if (easting >= 0 && easting <= IRISH_EN_MAX && northing >= 0 && northing <= IRISH_NN_MAX) {
      return 'irish'
    }
    return null
  }
  if (inGreatBritain(latitude, longitude)) {
    const { easting, northing } = projectToGrid('osgb', latitude, longitude)
    if (easting >= 0 && easting <= OSGB_EASTING_MAX && northing >= 0 && northing <= OSGB_NORTHING_MAX) {
      return 'osgb'
    }
  }
  return null
}

export function parseCampPositionInput(input: string): CampPosition {
  const trimmed = input.trim()
  if (trimmed === '') {
    throw new Error('Enter a grid reference or latitude and longitude.')
  }

  const asLatLong = parseNumericPair(trimmed)
  if (asLatLong) {
    const system = gridSystemForPosition(asLatLong.latitude, asLatLong.longitude)
    if (!system) {
      throw new Error('Position is outside Britain and Ireland (British National Grid and Irish Grid).')
    }
    return asLatLong
  }

  const compact = stripSpaces(trimmed)
  const leadingLetters = compact.match(/^([A-HJ-Z]+)/)?.[1] ?? ''
  if (leadingLetters.length === 2) {
    const en = osgbGridRefToEN(trimmed)
    return gridToWgs84('osgb', en.easting, en.northing)
  }
  if (leadingLetters.length === 1) {
    const en = irishGridRefToEN(trimmed)
    return gridToWgs84('irish', en.easting, en.northing)
  }

  throw new Error('Use a British (two letters) or Irish (one letter) grid reference, or lat, long.')
}

export function formatCampGridReference(
  latitude: number,
  longitude: number,
  digits = 8,
): { system: CampGridSystem; gridReference: string } | null {
  const system = gridSystemForPosition(latitude, longitude)
  if (!system) {
    return null
  }
  const { easting, northing } = projectToGrid(system, latitude, longitude)
  try {
    const gridReference =
      system === 'osgb'
        ? enToOsgbGridRef(easting, northing, digits)
        : enToIrishGridRef(easting, northing, digits)
    return { system, gridReference }
  } catch {
    return null
  }
}

export function formatCampLatLong(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(5)}° ${latitude >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(longitude).toFixed(5)}° ${longitude >= 0 ? 'E' : 'W'}`
  return `${lat}, ${lon}`
}

/** Metres between two WGS84 points (haversine). */
export function distanceMetres(a: CampPosition, b: CampPosition): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadius = 6_371_000
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const sinHalf =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(sinHalf)))
}

export function gridRoundTripMetres(
  system: CampGridSystem,
  easting: number,
  northing: number,
): number {
  const wgs = gridToWgs84(system, easting, northing)
  const back = projectToGrid(system, wgs.latitude, wgs.longitude)
  return Math.hypot(back.easting - easting, back.northing - northing)
}