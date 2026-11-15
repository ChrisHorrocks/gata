# Build ticket 23 — Terrain layers

Parent: #11. Issue: #23.

## Data source

- **Elevation**: [Mapterhorn](https://mapterhorn.com/) Terrarium RGB tiles in PMTiles form.
- **Download (extract time only)**: `https://download.mapterhorn.com/planet.pmtiles` (global z0–12).
- **Runtime**: self-hosted file on the tiles volume (same Caddy `file_server` as the basemap). No hotlinking of `download.mapterhorn.com` or `tiles.mapterhorn.com` in the SPA.

## Pipeline

```bash
./scripts/tiles/fetch-elevation.sh dev    # Snowdonia bbox → dev-elevation.pmtiles
./scripts/tiles/fetch-elevation.sh full   # Britain and Ireland → britain-ireland-elevation.pmtiles
```

`fetch-elevation.sh` prints the measured byte size after each extract; the README table is updated when a full extract is run on a maintainer machine.

## Contour spacing (OS Explorer style)

| Setting | Choice | Notes |
| ------- | ------ | ----- |
| Minor interval | 10 m | From z10 through z15 |
| Index (major) interval | 50 m | Bold line + elevation label (`level > 0` in maplibre-contour) |
| Low zoom (z9) | 50 m only | Avoid clutter when overzooming coarse DEM |
| 5 m supplementary | **Not used** | Dropped after review: 30 m source DEM makes 5 m lines visually noisy |

Line paint: 0.6 px minor, 1.25 px major; `#6b5b4a` lines; labels `11px` with white halo.

## Hill shading

MapLibre `hillshade` layer over the shared `raster-dem` source from `maplibre-contour` `DemSource` (512 px Terrarium WebP, exaggeration 0.35).

## Session persistence

`sessionStorage` keys `gata.map.hillshade` and `gata.map.contours` (default off).

## Attribution

`© Mapterhorn` → https://mapterhorn.com/attribution when hill shading or contours is on; `© OpenStreetMap` always.