#!/usr/bin/env bash
# Verify a Mapterhorn Terrarium PMTiles elevation extract.
set -euo pipefail

FILE="${1:-}"
if [[ -z "$FILE" || ! -f "$FILE" ]]; then
	echo "usage: $0 PATH_TO_ELEVATION.pmtiles" >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=ensure-pmtiles.sh
source "$SCRIPT_DIR/ensure-pmtiles.sh"
export PATH="$SCRIPT_DIR/.bin:${PATH}"

echo "=== pmtiles show ==="
SHOW="$(pmtiles show "$FILE")"
echo "$SHOW"

echo "=== pmtiles verify ==="
pmtiles verify "$FILE"

if echo "$SHOW" | grep -qi terrarium; then
	echo "Encoding check: Terrarium mentioned in metadata (ok)."
else
	echo "Note: confirm Terrarium encoding in tileset metadata if hillshade looks wrong." >&2
fi

MAX_Z="${ELEVATION_MAX_ZOOM:-12}"
if echo "$SHOW" | grep -q "max zoom: $MAX_Z"; then
	echo "Max zoom is $MAX_Z (ok)."
fi

echo "Elevation PMTiles OK: $FILE"