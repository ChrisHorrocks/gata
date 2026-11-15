/** OS Explorer–style intervals; 5 m at z14+ dropped — noisy on 30 m Mapterhorn DEM (issue #23). */
export const CONTOUR_THRESHOLDS: Record<number, number[]> = {
  9: [100, 100],
  // z10–11: coarser spacing — 10 m lines exceed MapLibre’s 65535 vertex segment limit on steep tiles.
  10: [50, 250],
  11: [50, 250],
  12: [10, 50],
  13: [10, 50],
  14: [10, 50],
  15: [10, 50],
}

export const CONTOUR_MAJOR_EVERY_M = 50
export const CONTOUR_MINOR_EVERY_M = 10