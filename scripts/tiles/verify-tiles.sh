#!/usr/bin/env bash
# Verify a PMTiles file opens, passes pmtiles verify, and bounds cover Britain and Ireland.
set -euo pipefail

if [[ $# -lt 1 ]]; then
	echo "usage: $0 PATH_TO.pmtiles" >&2
	exit 1
fi

FILE="$1"
if [[ ! -f "$FILE" ]]; then
	echo "File not found: $FILE" >&2
	exit 1
fi

if ! command -v pmtiles >/dev/null 2>&1; then
	echo "pmtiles CLI not found. Install via scripts/tiles/ensure-pmtiles.sh" >&2
	exit 1
fi

echo "=== pmtiles show ==="
SHOW="$(pmtiles show "$FILE")"
echo "$SHOW"

echo "=== pmtiles verify ==="
pmtiles verify "$FILE"

# Bounds check: west Ireland through east England / Scotland, south coast through north Scotland.
# The extract bbox in fetch-tiles.sh is documented; header bounds should overlap this region.
check_bounds() {
	python3 - "$SHOW" <<'PY'
import re, sys

text = sys.argv[1]
west = south = east = north = None
# go-pmtiles 1.31: bounds: (long: -4.15, lat: 52.95) (long: -3.85, lat: 53.15)
corner = re.findall(
    r"\(long:\s*([-\d.]+),\s*lat:\s*([-\d.]+)\)", text
)
if len(corner) >= 2:
    west, south = map(float, corner[0])
    east, north = map(float, corner[1])
else:
    m = re.search(
        r"bounds:\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)", text
    )
    if m:
        west, south, east, north = map(float, m.groups())
    else:
        nums = re.findall(r"min (lon|lat):\s*([-\d.]+)", text)
        maxs = re.findall(r"max (lon|lat):\s*([-\d.]+)", text)
        if len(nums) == 2 and len(maxs) == 2:
            west = float([v for k, v in nums if k == "lon"][0])
            south = float([v for k, v in nums if k == "lat"][0])
            east = float([v for k, v in maxs if k == "lon"][0])
            north = float([v for k, v in maxs if k == "lat"][0])

if west is None:
    print("Could not parse bounds from pmtiles show output", file=sys.stderr)
    sys.exit(1)

# Britain and Ireland coverage (loose): must span at least from Cork to Shetland, Belfast to Kent.
required = dict(west_max=-7.0, east_min=-1.0, south_max=52.0, north_min=58.0)
ok = west <= required["west_max"] and east >= required["east_min"] and south <= required["south_max"] and north >= required["north_min"]

if not ok:
    print(
        f"Bounds {west},{south},{east},{north} do not cover Britain and Ireland "
        f"(expected west<={required['west_max']}, east>={required['east_min']}, "
        f"south<={required['south_max']}, north>={required['north_min']})",
        file=sys.stderr,
    )
    sys.exit(1)
print(f"Bounds cover Britain and Ireland: {west},{south},{east},{north}")
PY
}

if [[ "${SKIP_BOUNDS_CHECK:-}" == "1" ]]; then
	echo "Skipping Britain/Ireland bounds check (SKIP_BOUNDS_CHECK=1)"
else
	check_bounds
fi

echo "Verification passed for $FILE"