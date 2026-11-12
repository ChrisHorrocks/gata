# Which self-hosted map tile option should gata use?

Research for [issue #9](https://github.com/ChrisHorrocks/gata/issues/9). Written 12 November 2026 (Europe/London, GMT). Versions, file sizes, and activity dates were checked against primary sources on that day.

## Recommendation

Use a **[Protomaps Basemap](https://docs.protomaps.com/basemaps/downloads/) PMTiles extract**, served as a static file from the Docker Compose stack, and display it with **MapLibre GL JS** (the fallback already chosen in [issue #3](https://github.com/ChrisHorrocks/gata/issues/3)) plus the official `pmtiles` JavaScript library and `@protomaps/basemaps` styles.

- **v1 coverage:** start with a United Kingdom extract (Great Britain and Northern Ireland). A dry-run of `pmtiles extract` against the 12 November 2026 daily build produced a **3.1 GB** archive at zooms 0–15. Britain and Ireland together is only slightly larger (**3.2 GB**). Europe is a different scale (**49 GB** at z0–15, or **25 GB** if capped at z14). The full planet file is **129.86 GiB**. Serving needs only a web server that supports HTTP Range Requests (Caddy or nginx already do); RAM is negligible compared with a render stack.
- **Do not** stand up a classic `mod_tile` / `renderd` / Mapnik / osm2pgsql raster stack for v1. [Switch2OSM](https://switch2osm.org/serving-tiles/) describes that path as hardware-intensive (about 1 TB of fast storage and 24 GB of RAM for the planet; even a Docker trial of a small extract wants around 30 GB because worldwide boundary data is included). It is a poor fit for a small-team Compose deployment whose map only pins camps.
- **Do not** standardise on an OpenMapTiles + Martin or TileServer GL pipeline as the default. It works, and TileServer GL can even emit raster PNGs for Leaflet, but it adds a tile-generation step, a tile-server process, and a mandatory **© OpenMapTiles** credit under the schema's CC-BY 4.0 design licence. Protomaps daily builds already are the tiles, and only OpenStreetMap attribution is required.
- **VersaTiles** (Shortbread schema, pre-built planet file 62.1 GB at z0–14) is a solid alternative if we later want a smaller planet file or public-domain styles with no optional Protomaps shout-out. It is not the v1 default: builds are snapshot-based rather than daily, and the first-class container is `.versatiles` rather than PMTiles (conversion is officially supported).

Keep the tile URL and attribution configurable, as issue #3 already recommended. Copy extracts onto our own storage; do not hotlink `build.protomaps.com`. Vendor fonts and sprites from [basemaps-assets](https://github.com/protomaps/basemaps-assets) rather than depending on `protomaps.github.io` in production.

A topo or contour *layer* is feasible later, not required for v1. The cheapest path is a [Mapterhorn](https://mapterhorn.com/data-access/) Terrarium DEM PMTiles extract used as a MapLibre `raster-dem` source (hillshade and optional 3D terrain). A UK extract at z0–12 is about **880 MB**; Europe is about **26 GB**. True contour *lines* are not in the Protomaps basemap and would need a separate tileset.

## Context

gata is a planner for small teams on multi-day treks with camping. The planned stack is FastAPI + Postgres, deployed with Docker Compose, and a Vite + React + TypeScript SPA. [Issue #3](https://github.com/ChrisHorrocks/gata/issues/3) chose Leaflet 1.9.4 with a small in-repo React wrapper for the map, and MapLibre GL JS as the fallback when official MIT React bindings, vector styles, or 3D terrain are wanted. GPX import is **not** in v1; the map shows camps pinned on OpenStreetMap. Chris wants self-hostable tiles. The official OSMF raster server at `tile.openstreetmap.org` must not be the production default ([OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/), [Switch2OSM: using tiles](https://switch2osm.org/using-tiles/)).

The user base is small, so a pre-generated tileset that is copied in and served statically beats a stack that imports OSM into Postgres and renders tiles on demand.

## Licensing and attribution

These rules apply to every option below. They come from the data and schema licences, not from whichever process serves the files.

### OpenStreetMap data (ODbL) — required for all OSM-derived tiles

OpenStreetMap data is licensed under the [Open Database License](https://www.openstreetmap.org/copyright). For a public, interactive map, [OSMF attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) (adopted 25 June 2021) are the safe harbour:

- Attribution must be to **“OpenStreetMap”**.
- It must also make clear that the data is available under the ODbL. The usual way is to make the word “OpenStreetMap” a link to [https://www.openstreetmap.org/copyright](https://www.openstreetmap.org/copyright).
- The historical forms **“© OpenStreetMap contributors”** and **“© OpenStreetMap”** are acceptable.
- On a browsable map, the credit should typically appear in a **corner of the map**, visible without the user having to interact first. It must be legible. It must not be hidden beneath UI, behind toggles, or off-screen. Limited fade or collapse after interaction or five seconds is allowed if the licence information remains findable (for example an “(i)” control).

The official OSMF tile servers are a separate matter: their [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) does not apply once we serve our own tiles. The ODbL attribution duty still does. Self-hosting is a Produced Work of the OSM database; see the [Licence and Legal FAQ](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ).

### Extra credits, by tileset

| Tileset or style | Extra visible credit | Source |
| --- | --- | --- |
| Protomaps basemap tiles and styles | None required. A Protomaps shout-out is requested, not required. Styles are CC0. If the optional `landcover` layer is shown, ESA WorldCover is CC-BY 4.0 and needs its own credit. | [basemaps README](https://github.com/protomaps/basemaps/blob/main/README.md), [LICENSE.md](https://github.com/protomaps/basemaps/blob/main/LICENSE.md), [LICENSE_DATA.md](https://github.com/protomaps/basemaps/blob/main/LICENSE_DATA.md) |
| OpenMapTiles schema or a style written for it (OSM Bright, Positron, and so on) | **© OpenMapTiles**, linking to https://openmaptiles.org/, in addition to OSM. Example given by the project: `[© OpenMapTiles](http://openmaptiles.org/) [© OpenStreetMap contributors](http://www.openstreetmap.org/copyright)`. | [OpenMapTiles LICENSE.md](https://github.com/openmaptiles/openmaptiles/blob/master/LICENSE.md) (code BSD-3-Clause; design CC-BY 4.0), [attribution docs](https://openmaptiles.org/docs/terminology/attribution/) |
| Shortbread schema (VersaTiles OSM tiles) | None beyond OSM. The schema is CC0. | [Shortbread copyright](https://shortbread-tiles.org/copyright/), [VersaTiles tilesets](https://docs.versatiles.org/basics/tilesets.html) |
| Mapterhorn terrain (Terrarium DEM) | **© Mapterhorn**, linking to [mapterhorn.com/attribution](https://mapterhorn.com/attribution). This string is already in the planet archive's metadata. | [Mapterhorn data access](https://mapterhorn.com/data-access/), archive metadata from `pmtiles show` on 12 November 2026 |
| Official OSM Carto raster (self-rendered) | OSM only, same as above. | [openstreetmap.org/copyright](https://www.openstreetmap.org/copyright) |

Suggested v1 attribution, matching Protomaps' own example and the OSMF safe harbour:

```html
© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
```

Optionally prefix a Protomaps link, as in their docs: `<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>`. If a Mapterhorn hillshade is added later, append `© <a href="https://mapterhorn.com/attribution">Mapterhorn</a>`.

## Options compared

### 1. Protomaps Basemap as a PMTiles file (recommended)

[PMTiles](https://docs.protomaps.com/pmtiles/) is a single-file archive of a Z/X/Y tile pyramid. Clients fetch only the bytes they need with HTTP Range Requests. There is no tile-server process, no SQLite, and no on-demand renderer. The archive is read-only: updates mean replacing the file.

The [Protomaps Basemap](https://docs.protomaps.com/basemaps/downloads/) is a general-purpose vector basemap (cities, roads, water, and other context) derived from OpenStreetMap, distributed as an ODbL Produced Work. A full planet file covers zooms 0–15 and is “roughly 120 gigabytes”; the 12 November 2026 daily build is listed as **129.86 GiB** (HTTP `Content-Length` 139,437,771,201 bytes). Builds are published at [maps.protomaps.com/builds](https://maps.protomaps.com/builds/). The bucket keeps all builds for the past week, plus the latest build for each patch version. The 12 November 2026 archive (`20261112.pmtiles`) reports `tile type: mvt`, `version 4.15.2`, compatible npm style versions 4 and 5, and metadata attribution already set to `© OpenStreetMap` linking at `https://www.openstreetmap.org/copyright`.

**Setup and maintenance.** Download (or extract) a file, put it on a volume, and serve it with any HTTP server that supports Range Requests. Official examples include the npm `http-server` package; any HTTP server that supports Range Requests works, including Caddy and nginx. Alternatively, [`pmtiles serve`](https://docs.protomaps.com/pmtiles/cli) decodes the archive and exposes a Z/X/Y API plus TileJSON (default directory cache 64 MB). That is useful if a client cannot speak PMTiles, but it is not required for MapLibre: the JS library registers a `pmtiles://` protocol and reads the file directly. Fonts and sprites need to be hosted too; they can be downloaded as zip files from [basemaps-assets](https://docs.protomaps.com/basemaps/maplibre). After that, maintenance is “replace the file when you want a newer map.” The project asks that daily-build URLs not be hotlinked, because they may change; copy the tileset to our own storage.

**Regional extracts.** `pmtiles extract` can cut a region from a local or remote archive, including from the daily-build URL, and supports `--maxzoom` (each added zoom level “roughly doubles” the size) and `--dry-run`. Measured dry-runs against `https://build.protomaps.com/20261112.pmtiles` with pmtiles CLI 1.31.2 on 12 November 2026 (Europe/London):

| Extract | Bounding box used (`min_lon,min_lat,max_lon,max_lat`) | z0–15 archive | z0–14 archive |
| --- | --- | --- | --- |
| United Kingdom (GB + NI, with a small margin) | `-9.0,49.8,2.0,61.0` | **3.1 GB** | **1.5 GB** |
| Britain and Ireland | `-11.0,49.7,2.1,61.1` | **3.2 GB** | not measured |
| Europe (bbox, so this is an upper bound versus a polygon cut) | `-25.0,34.0,45.0,72.0` | **49 GB** | **25 GB** |
| Planet | n/a (whole archive) | **129.86 GiB** | not measured |

These bounding boxes are rectangles, not Geofabrik polygons, so they include some sea and, for Europe, a strip of neighbouring land. The UK box is not a full extract of the Republic of Ireland; the Britain-and-Ireland box is.

**RAM and runtime.** A static file server plus the size of the archive on disk. No Postgres, no Mapnik, no JVM in production. Suitable as another service or volume in the existing Compose file.

**Leaflet versus MapLibre.** MapLibre is first-class: register the `pmtiles` protocol and point a vector source at `pmtiles://…/uk.pmtiles`, or use `@protomaps/basemaps` to build a style ([Basemaps for MapLibre](https://docs.protomaps.com/basemaps/maplibre)). Leaflet's core only consumes raster images. Raster PMTiles can be added with `leafletRasterLayer` from the `pmtiles` package, but the official Protomaps *basemap* build is vector (MVT), not raster. The vector path in Leaflet is [`protomaps-leaflet`](https://docs.protomaps.com/basemaps/leaflet), which the official docs mark as **maintenance mode** and recommend only for legacy Leaflet-heavy projects; it also renders to canvas and is “designed for non-interactive layers.” For a new app, Protomaps tells you to use MapLibre.

**Building our own instead of downloading.** The generation code is open source in [protomaps/basemaps](https://github.com/protomaps/basemaps). The README says a planet build from OSM and Natural Earth takes 2–3 hours on a modest computer. That is optional for v1; the daily builds already exist.

### 2. VersaTiles and the Shortbread schema

[VersaTiles](https://docs.versatiles.org/) is a self-hosted pipeline: generate (Planetiler + Shortbread), store (their container, or convert to PMTiles / MBTiles / tar), and serve (a Rust server, with a Docker story). Pre-built tiles are published at [download.versatiles.org](https://download.versatiles.org/). The current OSM vector planet file, `osm-vector.versatiles`, is **62.1 GB** at zooms 0–14 in the [Shortbread](https://shortbread-tiles.org/) schema. Official docs describe dated snapshots (for example `osm-vector.20261027.versatiles`), an RSS feed for new builds, and on-the-fly bounding-box extracts, including export to `.pmtiles`. They also publish landcover, hillshade, elevation, bathymetry, and (alpha) satellite tilesets.

**Why it is not the v1 default.** The planet file is smaller than Protomaps' mainly because it stops at z14 (consistent with Protomaps' “each additional zoom roughly doubles size”: a Europe Protomaps cut was 49 GB at z15 and 25 GB at z14). Update cadence is snapshot-based (the dated planet files on the download page in 2026 sit months apart: January, April, June, October), not daily. The native container and server are excellent, but gata would be taking on a second ecosystem (Shortbread styles via `@versatiles/style`, VersaTiles server) when PMTiles + MapLibre is already the documented path for the fallback map library. Attribution is otherwise attractive: Shortbread is [CC0](https://shortbread-tiles.org/copyright/), so only OSM needs a corner credit.

**Topo.** VersaTiles' elevation tileset is a Terrarium `raster-dem` sourced from Mapterhorn (the download page lists `elevation-raster.versatiles` at **331.2 GB**; the docs note that listed sizes are approximate and that the download site is authoritative). Their “hillshade” tileset is precomputed vector shade polygons (105.4 GB, alpha), not contour lines. See [How to add hillshading and 3D terrain](https://docs.versatiles.org/guides/hillshade_and_terrain.html).

### 3. Generate tiles with Planetiler, serve with Martin or TileServer GL

[Planetiler](https://github.com/onthegomap/planetiler) builds vector tiles from OSM (and other sources) into MBTiles or PMTiles, without an intermediate PostGIS database. Official profiles exist for OpenMapTiles, Protomaps, and Shortbread. The README's resource rule of thumb: at least **0.5×** the input `.osm.pbf` size in RAM, and **1 GB plus 5–10×** that size in SSD. It only does full imports; there is no incremental or minutely update path.

Input PBF sizes on 12 November 2026:

| Area | PBF size | Source | Implied Planetiler RAM / working disk (rule of thumb, not a measured run) |
| --- | --- | --- | --- |
| United Kingdom | **2.1 GB** (data up to 2026-11-11 21:22 UTC) | [Geofabrik UK](https://download.geofabrik.de/europe/united-kingdom.html) | ~1 GB RAM; ~11–21 GB SSD plus the PBF and output |
| Europe | **33.0 GB** (same timestamp) | [Geofabrik Europe](https://download.geofabrik.de/europe.html) | ~16.5 GB RAM; ~165–330 GB SSD plus inputs |
| Planet | **89 GB** weekly PBF | [planet.openstreetmap.org](https://planet.openstreetmap.org/) | ~44.5 GB RAM; ~445–890 GB SSD plus inputs |

Official Planetiler benchmarks for the OpenMapTiles profile (planet, excluding download) include 2 h 38 m on a 16-CPU / 32 GB machine and 42 m on a 64-CPU / 128 GB machine, writing on the order of 69–81 GB of tiles for those 2022–2026 planet files (smaller than today's Protomaps z0–15 planet, and at the OpenMapTiles max zoom of 14). A UK or Europe build is therefore practical if we ever want our own schema or zoom, but it is unnecessary while daily Protomaps builds cover the same need.

**Martin** ([self-hosted basemap recipe](https://maplibre.org/martin/recipe-basemap-selfhosted/)) can serve one MBTiles/PMTiles archive plus fonts, sprites, and the style from a single process. The official recipe uses Planetiler's OpenMapTiles profile and OSM Bright, and states that the map must display `© OpenMapTiles` and `© OpenStreetMap contributors`.

**TileServer GL** ([OpenMapTiles hosting docs](https://openmaptiles.org/docs/host/tileserver-gl/), [endpoints](https://tileserver.readthedocs.io/en/latest/endpoints.html)) serves vector tiles and can also **render raster** PNGs/JPEGs/WebP from a style at `/styles/{id}/{z}/{x}/{y}.png`, which Leaflet can consume as a normal `L.tileLayer`. That raster path is not in the `tileserver-gl-light` package. It is the least-painful way to keep Leaflet if we refuse both MapLibre and `protomaps-leaflet`, at the cost of a heavier Node + native renderer process and, if the style is an OpenMapTiles style, the extra © OpenMapTiles credit.

This family is the right tool when we need a custom schema, PostGIS overlays later, or Leaflet-compatible raster output. It is more moving parts than v1 needs.

### 4. Classic raster stack (`mod_tile`, `renderd`, Mapnik, osm2pgsql)

[Switch2OSM: serving your own tiles](https://switch2osm.org/serving-tiles/) is the official guide for the OSM Carto raster toolchain: Apache (or similar) + `mod_tile` + `renderd` + Mapnik + osm2pgsql into PostgreSQL/PostGIS. Tiles are rendered on demand and cached. The database can be kept current from the one-minute OSM diff stream.

**Hardware, from Switch2OSM itself:** “10–20 GB of storage, 4 GB of memory, and a modern dual-core processor for a city-sized region” up to “1 TB of fast storage, 24 GB of memory, and a quad-core processor for the entire planet.” They recommend starting with a Geofabrik extract, not the planet. The [Docker walkthrough](https://switch2osm.org/serving-tiles/using-a-docker-container/) (the `overv/openstreetmap-tile-server` image) adds that “you'll need around 30 GB of disk space for even a small data extract, because the worldwide boundary data that is added to the database is quite large.” Switch2OSM does not publish a UK- or Europe-specific official figure; treat the city and planet numbers as the bounded range, and plan on the 30 GB Docker floor even for a trial.

This stack produces raster PNG tiles that Leaflet consumes natively, and it can follow OSM edits within minutes. For gata v1 that freshness is unused, and the operational cost (a second Postgres, import times, render queue, tile cache, style maintenance) is out of proportion to pinning camps on a basemap. Skip it.

## Disk, RAM, and update cadence (summary)

| Option | UK disk | Europe disk | Planet disk | Production RAM | Update cadence |
| --- | --- | --- | --- | --- | --- |
| **Protomaps PMTiles extract (recommended)** | 3.1 GB at z0–15 (1.5 GB at z14) | 49 GB at z0–15 (25 GB at z14) | 129.86 GiB (z0–15) | Static file server, or ~64 MB cache if using `pmtiles serve` | Daily builds exist. Copy an extract; replace the file (weekly or monthly is plenty for a planner). No in-place patch. |
| VersaTiles OSM Shortbread | Regional extract via `versatiles convert --bbox` (not measured here) | Same | 62.1 GB (z0–14) | VersaTiles server process (official Docker guides) | Dated snapshots; several planet builds published across 2026, not daily |
| Planetiler self-build (working set, then output) | ~11–21 GB SSD + 2.1 GB PBF + output, ~1 GB JVM | ~165–330 GB SSD + 33 GB PBF + output, ~16.5 GB JVM | ~445–890 GB SSD + 89 GB PBF + output, ~45 GB JVM | Only during a rebuild. Serving afterwards is Martin / TileServer GL / static PMTiles. | Full rebuild only. Weekly planet or Geofabrik extracts are the natural inputs. |
| Classic raster stack | Officially unspecified; Docker trial floor ~30 GB even for a small extract | Officially unspecified; between city and planet | ~1 TB fast storage | Switch2OSM: 4 GB (city) to 24 GB (planet) | Can apply minutely diffs; optional in the Docker image |

Geofabrik also publishes a “Britain and Ireland” PBF at 2.5 GB if we ever build with Planetiler rather than cutting a Protomaps bbox.

## Leaflet versus MapLibre

Issue #3 already chose Leaflet for a simple raster polyline-and-markers map, with MapLibre as the fallback. Self-hosting tiles forces that choice back into the open:

- **Keeping Leaflet and a raster basemap** means either the classic render stack, or a renderer such as TileServer GL that rasterises vector tiles into PNG. Both add a service we would not otherwise run.
- **Keeping Leaflet and a vector basemap** means `protomaps-leaflet`, which Protomaps itself places in maintenance mode and describes as a canvas, non-interactive layer.
- **Switching the map library to MapLibre**, already named as the fallback, is the path the PMTiles and Protomaps docs are written for. It also unlocks hillshade and 3D terrain later without another library change. Camp markers stay ordinary MapLibre markers or a GeoJSON source.

The recommendation is to take the fallback now for the map component, rather than stretching Leaflet around a vector tileset.

## Topo and contour feasibility

For a trekking planner, relief matters more than street-map styling. None of the v1-recommended basemaps include contour *lines* as a standard layer.

**Hillshade and 3D terrain are straightforward**, once the frontend is MapLibre:

- [Mapterhorn](https://mapterhorn.com/data-access/) publishes Terrarium-encoded WebP terrain in PMTiles (512 px tiles). The planet archive at `https://download.mapterhorn.com/planet.pmtiles` is zooms 0–12; HTTP `Content-Length` on 12 November 2026 was 355,579,263,191 bytes (**331.15 GiB**), last modified 11 September 2026 14:58 UTC. A UK extract dry-run was **880 MB**; a Europe extract dry-run was **26 GB**. Higher zooms (13+) are published as separate regional archives and can be merged with `pmtiles merge`. MapLibre consumes this as `type: "raster-dem", encoding: "terrarium"` ([PMTiles for MapLibre](https://docs.protomaps.com/pmtiles/maplibre)). Credit **© Mapterhorn**.
- VersaTiles packages the same idea as their elevation tileset, with official style helpers for hillshade and pitched terrain.

**Contour lines** would be a separate product: generate isolines from a DEM (or find a tileset that already has them) and overlay them. VersaTiles' “hillshade” tileset is precomputed shade polygons, not labelled contours. Official UK topographic mapping (OS Maps and similar) is a licensed, not self-hosted OSM, question and is out of scope here.

Recommendation: ship v1 without relief; adding a UK Mapterhorn extract later is a small disk increment and a style change, not a new server.

## Implementation notes

1. Add a tiles volume to Docker Compose. Serve `uk.pmtiles` (or whatever extract we choose) with Caddy or nginx, and also serve the Protomaps fontstacks and sprites from [basemaps-assets](https://github.com/protomaps/basemaps-assets). Confirm Range Requests and, if the SPA and tiles are on different origins, CORS.
2. In the SPA, use MapLibre GL JS with a one-time `maplibregl.addProtocol("pmtiles", …)` hook and `@protomaps/basemaps` for the style (`light` is a reasonable default). Point the source at our own URL, not at `build.protomaps.com`. Put camp pins on top as markers or GeoJSON.
3. Default attribution: `© OpenStreetMap` in a map corner, linking to `https://www.openstreetmap.org/copyright`. Keep both the tile URL and the attribution string configurable, as issue #3 required.
4. Refresh procedure: `pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles uk.pmtiles --bbox=…` (or extract from a copied planet file), verify with `pmtiles show` / `pmtiles verify`, replace the volume, no rebuild of the app image required. A weekly or monthly cron is enough. Do not hotlink the daily-build bucket from browsers.
5. If we later need Leaflet-compatible raster after all, introduce TileServer GL in front of a PMTiles or MBTiles file and leave the extract pipeline unchanged. Do not start from `mod_tile` to get there.
6. The United Kingdom Geofabrik extract excludes the Isle of Man and the Channel Islands; they have their own extracts, and “Britain and Ireland” is the larger official region. The bbox used in the size measurements includes a margin around GB and NI only, unless the Britain-and-Ireland box is chosen.

## Sources not already listed inline

- [PMTiles concepts](https://docs.protomaps.com/pmtiles/), [pmtiles CLI](https://docs.protomaps.com/pmtiles/cli), [PMTiles for Leaflet](https://docs.protomaps.com/pmtiles/leaflet/), [protomaps/PMTiles](https://github.com/protomaps/PMTiles/)
- [Protomaps legal / attribution](https://protomaps.com/legal)
- [Planetiler PLANET.md](https://github.com/onthegomap/planetiler/blob/main/PLANET.md)
- [VersaTiles: how to download tiles](https://docs.versatiles.org/guides/download_tiles.html), [local server with Docker](https://docs.versatiles.org/guides/local_server_docker.html)
- [overv/openstreetmap-tile-server](https://github.com/Overv/openstreetmap-tile-server) (the image Switch2OSM's Docker guide points at)
- [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and [vector tile policy](https://operations.osmfoundation.org/policies/vector/) (apply only to OSMF-hosted services, not to self-hosted tiles)
