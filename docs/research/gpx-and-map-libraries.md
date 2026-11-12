# Which GPX parsing and map libraries should gata use?

Research for [issue #3](https://github.com/ChrisHorrocks/gata/issues/3). Written 12 November 2026 (Europe/London, GMT). Versions and activity dates were checked against primary sources on that day.

## Recommendation

- **Backend:** use **[gpxpy](https://github.com/tkrajina/gpxpy) 1.6.2** to parse imported GPX, compute per-day distance and ascent, and write the exported GPX with camps as waypoints. It is Apache-2.0 licensed, ships first-party type hints, and already implements read/write, waypoints, 2D/3D length, and smoothed uphill/downhill. Pin the PyPI release. Handle both `<trk>` tracks and `<rte>` routes in application code (see [Implementation notes](#implementation-notes)).
- **Frontend:** use **[Leaflet](https://leafletjs.com/) 1.9.4** to draw the route as a polyline and camps as markers on raster OpenStreetMap-style tiles. Write a small in-repo React/TypeScript wrapper. **Do not use `react-leaflet`:** current versions are licensed under the Hippocratic License 2.1, an ethical-source licence with field-of-use conditions that sit poorly next to gata's BSD-3-Clause licence.
- **Tiles:** do **not** hard-code `tile.openstreetmap.org` as the production default. Make the tile URL (and attribution) configurable. For local development, the official OSMF raster server may be used lightly if its policy is followed exactly. For a hosted app, use a third-party OSM-derived provider or self-hosted tiles, as [Switch2OSM](https://switch2osm.org/using-tiles/) and the [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/) both advise.

If the project prefers a maintained third-party React wrapper with a conventional permissive licence, the fallback is **MapLibre GL JS 6.x** with **`@vis.gl/react-maplibre`**. That stack is a better fit later (vector styles, 3D terrain) but is several times larger, and it is more than v1 needs.

## Context

gata is a planner for small teams on multi-day treks with camping. Users import a GPX route; the backend derives per-day distance and ascent; the frontend shows the route and camps on an OpenStreetMap map; a GPX download with camps as waypoints is exported. Units are metric only. The planned stack is FastAPI + Pydantic + SQLAlchemy + Alembic + Postgres on the backend, and Vite + React + TypeScript + React Router + TanStack Query + shadcn/ui (Tailwind) on the frontend. The repository is licensed [BSD-3-Clause](https://github.com/ChrisHorrocks/gata/blob/master/LICENSE).

## Backend: GPX parsing and writing

### gpxpy (recommended)

| Topic | Finding | Source |
| --- | --- | --- |
| Role | Python library for parsing and manipulating GPX files | [gpxpy README](https://github.com/tkrajina/gpxpy) |
| Licence | Apache License 2.0 | [LICENSE.txt](https://github.com/tkrajina/gpxpy/blob/dev/LICENSE.txt), [PyPI](https://pypi.org/project/gpxpy/) |
| Latest PyPI release | 1.6.2, uploaded 29 November 2023; requires Python ≥ 3.6 | [PyPI gpxpy](https://pypi.org/project/gpxpy/), [PyPI JSON](https://pypi.org/pypi/gpxpy/json) |
| Maintenance | Repository is not archived. Default branch is `dev`. Commits continued through 25 October 2026 (GMT), including fixes for duration, segment length types, and treating zero elevation as valid. No GitHub release newer than v1.6.2, so PyPI lags the repo. | [GitHub repo](https://github.com/tkrajina/gpxpy), [commits](https://api.github.com/repos/tkrajina/gpxpy/commits), [tags](https://api.github.com/repos/tkrajina/gpxpy/tags) |
| Typing | Ships a `py.typed` marker. The project requires type hints and `mypy` on PRs. | [setup.py `package_data`](https://github.com/tkrajina/gpxpy/blob/dev/setup.py), 1.6.2 tree, [README](https://github.com/tkrajina/gpxpy) |
| Parse and write | `gpxpy.parse(...)` reads GPX 1.0 and 1.1. `gpx.to_xml()` writes XML. Objects can be built from scratch, including tracks, routes, and waypoints. Uses `lxml` if installed, otherwise `minidom`. | [README](https://github.com/tkrajina/gpxpy) |
| Waypoints | First-class `GPXWaypoint` with name, description, elevation, symbol, type, and related fields. A `GPX` instance has a `waypoints` list serialised as `<wpt>` elements. | [gpx.py `GPXWaypoint` and `GPX.waypoints`](https://github.com/tkrajina/gpxpy/blob/v1.6.2/gpxpy/gpx.py) |
| Distance | `length_2d()` sums planar (lat/lon) length in metres; `length_3d()` includes elevation. Default point-to-point distance uses a fast equirectangular approximation, falling back to haversine when the latitude or longitude delta exceeds 0.2°. Haversine can be forced. Earth radius is the WGS84 semi-major axis, 6378.137 km. **`GPX.length_2d()` / `length_3d()` sum tracks only, not routes.** Routes expose a separate `length()` that is 2D only. | [geo.py](https://github.com/tkrajina/gpxpy/blob/v1.6.2/gpxpy/geo.py), [gpx.py `GPX.length_2d` and `GPXRoute.length`](https://github.com/tkrajina/gpxpy/blob/v1.6.2/gpxpy/gpx.py) |
| Ascent | `get_uphill_downhill()` returns an `UphillDownhill` named tuple in metres. Points without elevation are ignored. Before summing, it applies a 3-point weighted filter (0.3, 0.4, 0.3) inside `calculate_uphill_downhill()`. **This method exists on tracks and segments, not on routes.** | [geo.py `calculate_uphill_downhill`](https://github.com/tkrajina/gpxpy/blob/v1.6.2/gpxpy/geo.py), [gpx.py `get_uphill_downhill`](https://github.com/tkrajina/gpxpy/blob/v1.6.2/gpxpy/gpx.py) |
| Extra smoothing | `smooth(vertical=True, horizontal=False, remove_extremes=False)` mutates point elevations (and optionally positions) with a different 3-point ratio, `(0.4, 0.2, 0.4)`. It can be called more than once. `get_uphill_downhill()` already smooths a copy of the elevations; calling `smooth()` first is optional and changes the stored points. | [gpx.py `SMOOTHING_RATIO` and `GPXTrackSegment.smooth`](https://github.com/tkrajina/gpxpy/blob/v1.6.2/gpxpy/gpx.py) |
| Other utilities | `simplify(max_distance=...)` (Ramer–Douglas–Peucker), `get_elevation_extremes()`, `get_nearest_location()`, `walk()`, `clone`-style edits, and `gpx-cmd-tools` as a separate package. The README also points at [srtm.py](https://github.com/tkrajina/srtm.py) to fill missing elevation. | [README](https://github.com/tkrajina/gpxpy), [gpx.py](https://github.com/tkrajina/gpxpy/blob/v1.6.2/gpxpy/gpx.py) |

### Alternatives considered

| Library | Licence | Why it is not the v1 choice | Sources |
| --- | --- | --- | --- |
| [`gpx`](https://pypi.org/project/gpx/) (sgraaf), latest 2026.4.0 (13 September 2026) | GPL-3.0-or-later | Actively maintained, zero-dependency, with `total_distance`, `total_ascent`, a `smooth(window=...)` helper, schema validation, and write support. GPL-3.0-or-later is a copyleft licence. Depending on it from gata, which is BSD-3-Clause, would force a licence change for distributed combined work. | [PyPI gpx](https://pypi.org/project/gpx/), [sgraaf/gpx](https://github.com/sgraaf/gpx), [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html), [gata LICENSE](https://github.com/ChrisHorrocks/gata/blob/master/LICENSE) |
| [`ezgpx`](https://pypi.org/project/ezgpx/) 0.3.3 | GNU GPLv3 | Read/write, simplify, conversions. Same copyleft problem, smaller community (25 GitHub stars). | [PyPI ezgpx](https://pypi.org/project/ezgpx/), [FABallemand/ezGPX](https://github.com/FABallemand/ezGPX) |
| [`fastgpx`](https://pypi.org/project/fastgpx/) 0.8.0 | MIT | Faster parser (Rust/C++). The author describes it as experimental and "not intended as a replacement for gpxpy", with an emphasis on extraction rather than full manipulate-and-write. One GitHub star at time of research. | [PyPI fastgpx](https://pypi.org/project/fastgpx/), [thomthom/fastgpx](https://github.com/thomthom/fastgpx) |
| [`srtm.py`](https://pypi.org/project/srtm.py/) 0.3.7 | Apache-2.0 | Companion for filling missing elevation from SRTM, not a GPX parser. Last PyPI release 27 February 2021; last GitHub push 22 June 2022. Too stale to depend on without a fresh evaluation. | [PyPI srtm.py](https://pypi.org/project/srtm.py/), [tkrajina/srtm.py](https://github.com/tkrajina/srtm.py) |

A hand-rolled `xml.etree` parser plus custom distance/ascent would also work, but would reimplement the parts of gpxpy gata actually needs (including waypoint write-back and noisy-elevation handling).

## Frontend: map libraries

### Leaflet 1.9.4, wrapped in-repo (recommended)

| Topic | Finding | Source |
| --- | --- | --- |
| Role | Open-source library for interactive maps, designed around raster tile layers, markers, and vector overlays (polylines, GeoJSON). Official site claims "about 40 KB of JS". | [leafletjs.com](https://leafletjs.com/) |
| Licence | BSD-2-Clause, compatible with gata's BSD-3-Clause | [Leaflet LICENSE](https://github.com/Leaflet/Leaflet/blob/main/LICENSE), [GitHub licence metadata](https://api.github.com/repos/Leaflet/Leaflet), [npm `leaflet`](https://www.npmjs.com/package/leaflet) |
| Stable release | 1.9.4, published 18 May 2023. Still the npm `latest` tag on 12 November 2026. | [Leaflet releases](https://github.com/Leaflet/Leaflet/releases), [npm leaflet](https://www.npmjs.com/package/leaflet) |
| Leaflet 2 | 2.0.0-beta.4 was published 12 November 2026, 16:26 GMT. It ships first-party TypeScript types (`dist/types/index.d.ts`) and a tree-shakable ESM build. The API is still allowed to change before 2.0.0. Do not standardise on it for v1. | [leafletjs.com](https://leafletjs.com/), [v2.0.0-beta.4](https://github.com/Leaflet/Leaflet/releases/tag/v2.0.0-beta.4), [API reference banner](https://leafletjs.com/reference.html), [npm dist-tags](https://www.npmjs.com/package/leaflet) |
| Maintenance | Repository is active (`main` pushed 12 November 2026). 45,913 stars. Work is concentrated on the 2.0 betas; 1.9.4 is the current stable line. | [Leaflet/Leaflet](https://github.com/Leaflet/Leaflet) |
| TypeScript | 1.9.4 does not bundle types. Use DefinitelyTyped [`@types/leaflet`](https://www.npmjs.com/package/@types/leaflet) 1.9.22 (MIT, updated 1 August 2026). Leaflet 2 bundles its own types. | [npm leaflet 1.9.4](https://www.npmjs.com/package/leaflet), [npm `@types/leaflet`](https://www.npmjs.com/package/@types/leaflet) |
| Bundle size (measured 12 November 2026) | Official `leaflet@1.9.4/dist/leaflet.js` is 144.1 KiB raw / **41.4 KiB gzip**; `leaflet.css` is 14.5 KiB raw / 3.4 KiB gzip. Leaflet 2.0.0-beta.4 `dist/leaflet.js` is 141.4 KiB raw / 40.9 KiB gzip; CSS 9.7 KiB raw / 2.6 KiB gzip. Matches the project's "about 40 KB" claim. | Files from [unpkg leaflet@1.9.4](https://unpkg.com/leaflet@1.9.4/dist/leaflet.js) and [jsDelivr leaflet@2.0.0-beta.4](https://cdn.jsdelivr.net/npm/leaflet@2.0.0-beta.4/dist/leaflet.js), gzip -9 |
| Route and camps | First-class `Polyline` (or `GeoJSON`) for the imported line, and `Marker` with `Popup`/`Tooltip` for camps. Markers can be dragged. `fitBounds` frames the trip. Built-in attribution control. Leaflet has no built-in elevation profile or 3D terrain; v1 does not need either on the map itself (ascent is computed on the server). | [Leaflet API: Marker, Polyline, TileLayer, Attribution](https://leafletjs.com/reference.html) |
| OSM tiles | `TileLayer` takes a URL template and an `attribution` string. The official homepage and React Leaflet examples still show `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. That **does not** match the current OSMF required URL, which is exactly `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (no `{s}` subdomain). | [leafletjs.com](https://leafletjs.com/), [OSMF tile policy §1](https://operations.osmfoundation.org/policies/tiles/) |

### Why not react-leaflet

`react-leaflet` is the usual React binding. Version 5.0.0 (14 December 2024) is the npm `latest`. It provides `MapContainer`, `TileLayer`, `Marker`, `Popup`, and related components, plus typings at the package root (you still need `@types/leaflet`). Peer dependencies are `leaflet ^1.9.0` and React 19 — it does **not** declare support for Leaflet 2.

The licence, however, is **Hippocratic License 2.1**, in use since 3.0.1 (7 November 2020). The last MIT release was 2.8.0. The Hippocratic text grants permission only if use is consistent with stated Human Rights Principles and Human Rights Laws, requires indemnity for violations, and can terminate if those conditions are not met or if a licensee declines related arbitration. The licence describes itself as an Ethical Source licence, not a conventional permissive OSI-style licence.

gata is BSD-3-Clause. Taking on a dependency with field-of-use restrictions and a termination/arbitration clause is a poor fit, even if the intended use (a trek planner) would likely satisfy the human-rights conditions. Leaflet itself remains BSD-2-Clause; the restriction is on the React bindings only. A thin in-repo wrapper around `leaflet` (a `MapContainer` that creates the map in an effect, plus components for `TileLayer`, `Polyline`, and `Marker`) avoids the licence and is enough for v1.

Sources: [react-leaflet npm](https://www.npmjs.com/package/react-leaflet), [installation / TypeScript](https://react-leaflet.js.org/docs/start-installation/), [popup example](https://react-leaflet.js.org/docs/example-popup-marker/), [v5.0.0 LICENSE.md](https://raw.githubusercontent.com/PaulLeCam/react-leaflet/v5.0.0/packages/react-leaflet/LICENSE.md), [PaulLeCam/react-leaflet releases](https://github.com/PaulLeCam/react-leaflet/releases), [npm version licences](https://registry.npmjs.org/react-leaflet).

### MapLibre GL JS + @vis.gl/react-maplibre (acceptable fallback)

| Topic | Finding | Source |
| --- | --- | --- |
| Role | GPU-accelerated MapLibre GL JS, an open-source fork of Mapbox GL JS 1.x, for vector (and raster) maps. React bindings are `react-map-gl/maplibre` or the MapLibre-only package `@vis.gl/react-maplibre`. | [maplibre-gl-js README](https://github.com/maplibre/maplibre-gl-js), [react-map-gl introduction](https://visgl.github.io/react-map-gl/docs) |
| Licence | MapLibre GL JS is BSD-3-Clause. `@vis.gl/react-maplibre` and `react-map-gl` are MIT. Compatible with gata. | [MapLibre LICENSE.txt at v6.18.0](https://raw.githubusercontent.com/maplibre/maplibre-gl-js/v6.18.0/LICENSE.txt), [npm maplibre-gl](https://www.npmjs.com/package/maplibre-gl), [npm @vis.gl/react-maplibre](https://www.npmjs.com/package/@vis.gl/react-maplibre), [react-map-gl LICENSE](https://raw.githubusercontent.com/visgl/react-map-gl/v8.1.3/LICENSE) |
| Releases | MapLibre GL JS 6.18.0 published 11 November 2026, 21:25 GMT (also a 5.24.1 line). `@vis.gl/react-maplibre` 8.1.3 published 2 September 2026. Both projects are actively released. | [maplibre-gl-js releases](https://github.com/maplibre/maplibre-gl-js/releases), [visgl/react-map-gl releases](https://github.com/visgl/react-map-gl/releases), [npm](https://www.npmjs.com/package/maplibre-gl) |
| TypeScript | First-party typings: `dist/maplibre-gl.d.ts` and `@vis.gl/react-maplibre`'s `dist/index.d.ts`. | [npm maplibre-gl 6.18.0](https://www.npmjs.com/package/maplibre-gl), [npm @vis.gl/react-maplibre 8.1.3](https://www.npmjs.com/package/@vis.gl/react-maplibre) |
| Bundle size (measured 12 November 2026) | Official `maplibre-gl@6.18.0` `dist/maplibre-gl.mjs` is 1082.9 KiB raw / **289.0 KiB gzip**; `maplibre-gl.css` is 69.9 KiB raw / 10.0 KiB gzip. Roughly **seven times** the gzip size of Leaflet 1.9.4 JS. The npm package unpacks to about 29 MB because it includes typings, workers, and source maps. | npm tarball [maplibre-gl-6.18.0.tgz](https://registry.npmjs.org/maplibre-gl/-/maplibre-gl-6.18.0.tgz) |
| Route and camps | Draw the GPX as a GeoJSON `LineString` source plus a `line` layer. Camps are `Marker` instances (HTML pins, popups, optional dragging). `@vis.gl/react-maplibre` wraps both `Map` and `Marker`. | [Add a GeoJSON line](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-geojson-line/), [Marker API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Marker/), [react-map-gl Marker](https://visgl.github.io/react-map-gl/docs/api-reference/maplibre/marker) |
| Elevation on the map | First-class 3D terrain and hillshade via a `raster-dem` source (`terrain` in the style spec). This is a MapLibre strength, but v1 computes ascent on the server and does not require a 3D map. DEM tiles are a separate data source, not the GPX elevations. | [3D Terrain example](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/), [Terrain style spec](https://maplibre.org/maplibre-style-spec/terrain/) |
| OSM tiles | Raster OSM tiles work: a style with a `raster` source and a `raster` layer. Official examples demonstrate this, including one that still uses the withdrawn `a.tile.openstreetmap.org` hostname. Vector styles (for example OpenFreeMap, used in the GeoJSON-line example) are the more natural path for MapLibre. | [Add a raster tile source](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-raster-tile-source/), [3D Terrain example](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/), [OSMF tile policy §1](https://operations.osmfoundation.org/policies/tiles/) |

MapLibre is the right library if gata later wants client-rendered vector maps, hillshade, or 3D terrain. For v1 (a route line and camp pins on a basemap) it is heavier than necessary, and it still needs a tile or style provider under the same OSMF constraints.

## Tile-source terms

OpenStreetMap **data** is free (ODbL). OSMF **tile servers** are not. Two public services matter:

### Raster: `tile.openstreetmap.org`

The [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) applies only to the Standard Carto raster tiles at `tile.openstreetmap.org`. Requirements include:

- Use exactly `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Other subdomains or hostnames (including the widely copied `{s}.tile.openstreetmap.org` pattern) may be slower or withdrawn.
- Show visible licence attribution, typically in a map corner, following the [Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines). Do not hide it under UI or off-screen.
- From web pages, send a valid `Referer`. Do not set a `Referrer-Policy` that strips it. Browsers already send a User-Agent; native apps and non-browser clients must set a distinct identifying User-Agent (library defaults such as `python-requests` are blocked).
- Honour cache headers, or cache for at least seven days. Do not send `Cache-Control: no-cache` / `Pragma: no-cache` by default.
- **Do not** bulk-download, prefetch, or offer offline tile packs from this server.
- Availability is best-effort, with no SLA. OSMF may block access without notice. Commercial services, or those that seek donations, are explicitly warned that access may be withdrawn, leaving them unable to serve paying users.
- Do not hard-code the tile URL; switching should be possible without a software update.

[Switch2OSM — Using Tiles](https://switch2osm.org/using-tiles/) is more blunt: "Apart from very limited testing purposes, you should not use the tiles supplied by OpenStreetMap.org itself." It recommends a third-party provider or self-hosted tiles, and lists Leaflet, OpenLayers, and MapLibre as libraries.

### Vector: `vector.openstreetmap.org`

OSMF also runs a [vector tile service](https://operations.osmfoundation.org/policies/vector/) at `https://vector.openstreetmap.org/$VERSION/{zoom}/{x}/{y}.mvt` (and a TileJSON). The same themes apply: attribution, identifying User-Agent / Referer, caching, no bulk or offline download, no hard-coded URL, no SLA, access may be withdrawn. This service is a natural pair for MapLibre, not for Leaflet 1.9.

### Attribution (applies whenever OSM data is shown)

The [OSMF Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) (adopted 25 June 2021) are the safe harbour for ODbL credit. For an interactive map, credit should typically appear in a corner, be legible without a click, and include the name "OpenStreetMap" (historical forms such as "© OpenStreetMap contributors" are acceptable) with a link to [https://www.openstreetmap.org/copyright](https://www.openstreetmap.org/copyright) so the ODbL and OSM's own sources are reachable. Attribution may collapse after interaction or five seconds only if licence information remains findable (for example an "(i)" control). Printed / PDF trip sheets are "static images" / printed maps and still need credit, including the copyright URL in print.

### Alternatives

The raster policy points at the [community raster provider list](https://wiki.openstreetmap.org/wiki/Raster_tile_providers), [Switch2OSM providers](https://switch2osm.org/providers/), and [self-hosting guidance](https://switch2osm.org/). Vector tiles may be third-party or self-hosted; see the [vector tiles overview](https://wiki.openstreetmap.org/wiki/Vector_tiles).

One concrete public option, already used in [MapLibre's GeoJSON-line example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-geojson-line/), is [OpenFreeMap](https://openfreemap.org/) (`https://tiles.openfreemap.org/styles/...`). Its [Terms of Service](https://openfreemap.org/tos/) (last updated 14 October 2026) provide the service as-is, allow integration by people 18 or older, permit limited offline downloads (at most 3,000 tiles or 50 MB per download, at most four parallel requests, with a unique identifying User-Agent), and say the service may be discontinued without notice. Maps on the official site credit "OpenFreeMap", "© OpenMapTiles", and "Data from OpenStreetMap" (linking to the OSM copyright page). Any provider will add its own attribution on top of OSM's.

Practical recommendation for gata:

1. Keep basemap URL, min/max zoom, and attribution strings in configuration (environment or a settings table), not in compiled frontend code.
2. Use `tile.openstreetmap.org` only for light local development, with the exact HTTPS URL, visible OSM attribution, and no prefetch.
3. For Docker-hosted or public deployments, default to a third-party OSM-derived raster or vector style whose terms allow that use, or self-host tiles.
4. Never offer "download the map for offline use" against OSMF servers. v1 already decided planning happens at home and the trip sheet is a print/PDF plus a GPX file, which avoids this issue.

## Implementation notes

These are not extra library choices; they are how the recommended libraries should be used in gata.

- **Tracks versus routes.** Hiking exports may be a `<trk>` (recorded or densely sampled path) or a `<rte>` (planned route). `GPX.length_2d()` and `get_uphill_downhill()` ignore routes. Application code should detect which is present (or prefer tracks when both exist), and for routes call `route.length()` for distance and `gpxpy.geo.calculate_uphill_downhill([p.elevation for p in route.points])` for ascent.
- **Per-day figures.** Split the chosen point list at camp locations (for example `get_nearest_location` on the track, or user-placed breaks), then run `length_2d` and `calculate_uphill_downhill` on each day's slice. Rest days have no distance. Results are already in metres.
- **Missing elevation.** Many planned GPX files have no `ele` values. In that case ascent should be stored as unknown, not `0`. Filling gaps from a DEM is a later decision; `srtm.py` is the official gpxpy suggestion but looks unmaintained.
- **Zero elevation.** In 1.6.2, `has_elevations()` uses a truthiness check (`if track_point.elevation`), so an elevation of `0` is treated as missing. A fix landed on `dev` on 12 September 2026 ("Treat zero elevation as valid track data") but is not on PyPI yet. Prefer explicit `is not None` checks in gata code. Revisit when a release newer than 1.6.2 ships.
- **Export.** Reuse the imported GPX object (or rebuild it), append `GPXWaypoint` entries for each camp (name, lat, lon, optional elevation and type), and return `gpx.to_xml()`.
- **Frontend data.** The API should give the React app a polyline as lat/lon arrays or GeoJSON, plus camp coordinates, so the map library never has to parse GPX.
- **Leaflet wrapper.** Create the map once in a layout effect, import `leaflet/dist/leaflet.css`, and pass a configurable `TileLayer` URL and attribution. Use `Polyline` + `Marker`. Add `@types/leaflet`. Stay on 1.9.4 until Leaflet 2 is stable and the wrapper is updated.

## Sources not already listed inline

- gata repository and BSD-3-Clause licence: <https://github.com/ChrisHorrocks/gata>
- Issue under research: <https://github.com/ChrisHorrocks/gata/issues/3>
- OSMF operations policies index: <https://operations.osmfoundation.org/policies/>
- OSM wiki pointer to the official tile policy: <https://wiki.openstreetmap.org/wiki/Tile_usage_policy>
