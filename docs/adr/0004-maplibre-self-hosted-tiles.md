# 4. MapLibre with self-hosted PMTiles

Date: 2026-11-12. Status: accepted. Supersedes the Leaflet choice in #3.

## Context
Chris wants self-hostable map tiles, and the public OSMF tile server can't be used in production. See the research on #9.

## Decision
gata serves a Protomaps Basemap PMTiles extract of Britain and Ireland (about 3.2 GB) as a static file from Docker Compose, refreshed monthly, and draws it with MapLibre GL JS. Optional hillshade and contour layers come from one self-hosted Terrarium elevation tileset: MapLibre's hillshade layer for shading, and `maplibre-contour` for contours. The landcover layer is off in v1. The map credits "© OpenStreetMap", linking to its copyright page.

## Consequences
gata doesn't depend on a third-party tile service. The roughly 4 GB of tiles has to be downloaded and refreshed every month. Leaflet and its React wrapper are no longer used.
