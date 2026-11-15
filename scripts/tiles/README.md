# Map tiles pipeline

Self-hosted **Protomaps Basemap** PMTiles for Britain and Ireland (ADR 4). Tile archives are **never committed to git**.

## Disk space

| Profile | Output | Approximate size |
| ------- | ------ | ---------------- |
| `dev` | `tiles/data/dev-small.pmtiles` | A few MB |
| `full` | `tiles/data/britain-ireland.pmtiles` | ~3.2 GB (z0–15) |

### Elevation (Mapterhorn Terrarium, z0–12)

| Profile | Output | Approximate size |
| ------- | ------ | ---------------- |
| `dev` | `tiles/data/dev-elevation.pmtiles` | ~4.9 MB / 4 923 610 bytes (Snowdonia bbox; measured 2026-11-15) |
| `full` | `tiles/data/britain-ireland-elevation.pmtiles` | ~0.9 GB (measured after `fetch-elevation.sh full`; script prints bytes) |

Allow extra temporary space during `full` extract (network fetch + rewrite). Monthly refresh: extract a new file, run `verify-tiles.sh`, replace the file on the tiles volume.

## Prerequisites

- `curl`, `git`, `python3`
- `pmtiles` CLI (installed automatically by `ensure-pmtiles.sh` into `scripts/tiles/.bin` when missing)

## Steps

```bash
# Fonts and sprites (vendored locally; served by Caddy)
./scripts/tiles/fetch-basemaps-assets.sh

# Small extract for local development (default)
./scripts/tiles/fetch-tiles.sh dev

# Production-sized Britain and Ireland extract
./scripts/tiles/fetch-tiles.sh full

# Mapterhorn elevation (Terrarium PMTiles; download.mapterhorn.com at extract time only)
./scripts/tiles/fetch-elevation.sh dev
# ./scripts/tiles/fetch-elevation.sh full
```

Override the Protomaps build date if today's build is not yet published:

```bash
BUILD_DATE=20261112 ./scripts/tiles/fetch-tiles.sh full
```

## Verification

`fetch-tiles.sh` calls `verify-tiles.sh`, which runs `pmtiles show`, `pmtiles verify`, and (for `full`) checks header bounds cover Britain and Ireland. Re-run manually:

```bash
./scripts/tiles/verify-tiles.sh tiles/data/britain-ireland.pmtiles
```

For dev extracts:

```bash
SKIP_BOUNDS_CHECK=1 ./scripts/tiles/verify-tiles.sh tiles/data/dev-small.pmtiles
```

## Serving

Docker Compose includes a `caddy` service that serves `tiles/data` with HTTP Range Requests. The Vite dev server proxies `/tiles` to Caddy so the SPA stays on one origin.

## Decisions (issue #20)

- **Tile HTTP**: Caddy `file_server` on `TILES_ROOT` (Compose: `/srv/tiles`; local: absolute path to `tiles/data`). Vite strips the `/tiles` prefix when proxying so URLs stay `/tiles/...` in the SPA.
- **CORS**: `Access-Control-Expose-Headers: Content-Range` so the browser `pmtiles` client can read range responses (required for PMTiles over HTTP).
- **Landcover off**: filter Protomaps `landcover` source-layers out of the style rather than hotlinking optional ESA WorldCover.
- **Attribution**: custom corner control with config-driven `© OpenStreetMap` link; MapLibre built-in attribution control disabled.
- **Defaults**: Compose points the SPA at `dev-small.pmtiles` and `dev-elevation.pmtiles` until full extracts are fetched.
- **CI**: Vitest tests configuration, terrain toggles, and credit only; no PMTiles download in GitHub Actions.

## Decisions (issue #23)

- **Elevation source**: `https://download.mapterhorn.com/planet.pmtiles` extracted with the same Britain/Ireland and Snowdonia bboxes as the basemap (`fetch-elevation.sh`).
- **Runtime tile URL**: `pmtiles://{origin}/tiles/{file}/{z}/{x}/{y}.webp` via the existing MapLibre `pmtiles` protocol (512 px Terrarium WebP).
- **Contours**: `maplibre-contour` in the browser from that DEM; 10 m minor / 50 m labelled index from z10; 50 m only at z9; **no 5 m lines** (noisy on 30 m DEM).
- **Attribution**: `© Mapterhorn` when either terrain toggle is on; Vitest covers conditional credit.