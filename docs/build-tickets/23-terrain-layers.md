# #23 Terrain layers — build notes

## Data source

- **Archive:** Mapterhorn `planet.pmtiles` at `https://download.mapterhorn.com/planet.pmtiles` (Terrarium-encoded WebP, 512×512, z0–12 global pyramid).
- **Licence / credit:** `© Mapterhorn` → https://mapterhorn.com/attribution when hillshade or contours are on (with OSM credit).

## Extract pipeline

| Profile | Script | Output |
| --- | --- | --- |
| `dev` | `./scripts/tiles/fetch-elevation-tiles.sh dev` | `tiles/data/dev-elevation.pmtiles` (Snowdonia bbox, same as basemap dev) |
| `full` | `./scripts/tiles/fetch-elevation-tiles.sh full` | `tiles/data/britain-ireland-elevation.pmtiles` (z0–12, GB+IE bbox) |

Measured sizes: `23-elevation-size-dev.txt` (dev extract), `23-elevation-size-full-dryrun.txt` (~916 MB UK+Ireland z0–12, dry-run).

## Contour styling (OS Explorer style)

| Decision | Value |
| --- | --- |
| Index (major) interval | **50 m** (`level` = 1 on maplibre-contour; bold line + label) |
| Standard interval | **10 m** at z12–14 |
| High-zoom minors | **5 m** at z15–16 via `overzoom: 2` on z0–12 DEM (kept after Snowdonia visual check; free 30 m source can look noisy — drop 5 m by removing z15–16 `[5, 50]` entries in `terrainLayers.ts`) |
| Line colour | OS-like orange `rgb(215, 151, 60)` / labels `rgb(172, 120, 48)` |
| Hillshade | MapLibre `hillshade` with `hillshade-method: igor`, exaggeration 0.35 |

## Frontend

- **Hillshade + contours** share one self-hosted elevation PMTiles file. `maplibre-contour` reads tiles via `PMTiles.getZxy` (HTTP range on the same archive Caddy serves); no separate Z/X/Y HTTP tile server.
- **Session persistence:** `sessionStorage` key `gata.map.terrain-layers` for both toggles.
- **Config:** `VITE_MAP_ELEVATION_PMTILES_PATH` (default `/tiles/dev-elevation.pmtiles`).

## Ponytail scope (PR)

- No merge of z13+ regional Mapterhorn `6-x-y` archives (v1 uses z0–12 `planet` only per spec).
- Contours computed with `worker: false` on the main thread to avoid a second tile fetch path in the contour worker; acceptable for laptop planning UI.
- Automated map pixel tests are not in CI; Vitest covers toggles, session prefs, and conditional Mapterhorn credit only.