#!/usr/bin/env bash
# Extract Mapterhorn Terrarium elevation PMTiles for gata (UK+Ireland or Snowdonia dev bbox, z0–12).
# Uses download.mapterhorn.com only at extract time — the running app never hotlinks it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=ensure-pmtiles.sh
source "$SCRIPT_DIR/ensure-pmtiles.sh"
export PATH="$SCRIPT_DIR/.bin:${PATH}"

ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="${TILES_DATA_DIR:-$ROOT/tiles/data}"
mkdir -p "$DATA_DIR"

SOURCE_URL="${MAPTERHORN_SOURCE_URL:-https://download.mapterhorn.com/planet.pmtiles}"
PROFILE="${1:-dev}"

# Same bboxes as basemap fetch-tiles.sh (Britain and Ireland; Snowdonia dev).
BRITAIN_IRELAND_BBOX="${BRITAIN_IRELAND_BBOX:--10.854492,49.882893,1.912842,60.909393}"
DEV_BBOX="${DEV_BBOX:--4.15,52.95,-3.85,53.15}"
MAX_ZOOM=12

usage() {
	cat <<EOF
usage: $(basename "$0") [dev|full]

  dev   Small Snowdonia bbox -> tiles/data/dev-elevation.pmtiles (few MB)
  full  Britain and Ireland -> tiles/data/britain-ireland-elevation.pmtiles (~0.9 GB at z0-12)

Environment:
  MAPTERHORN_SOURCE_URL  Default https://download.mapterhorn.com/planet.pmtiles
  TILES_DATA_DIR         Output directory (default: repo tiles/data)
  BRITAIN_IRELAND_BBOX, DEV_BBOX  Override extract bounds
EOF
}

case "$PROFILE" in
	dev | full) ;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		echo "Unknown profile: $PROFILE" >&2
		usage >&2
		exit 1
		;;
esac

if [[ "$PROFILE" == "dev" ]]; then
	OUT="$DATA_DIR/dev-elevation.pmtiles"
	BBOX="$DEV_BBOX"
	echo "Extracting dev elevation (Snowdonia bbox, z0-${MAX_ZOOM}) to $OUT"
else
	OUT="$DATA_DIR/britain-ireland-elevation.pmtiles"
	BBOX="$BRITAIN_IRELAND_BBOX"
	echo "Extracting Britain and Ireland elevation (z0-${MAX_ZOOM}) to $OUT"
	echo "Dry-run tile count (no download):"
	pmtiles extract "$SOURCE_URL" "${OUT}.dryrun" --bbox="$BBOX" --maxzoom="$MAX_ZOOM" --dry-run || true
fi

echo "Source: $SOURCE_URL"
echo "Bbox: $BBOX"

TMP_OUT="${OUT}.partial"
rm -f "$TMP_OUT"
pmtiles extract "$SOURCE_URL" "$TMP_OUT" --bbox="$BBOX" --maxzoom="$MAX_ZOOM"
mv "$TMP_OUT" "$OUT"

BYTES=$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")
MIB=$(awk "BEGIN { printf \"%.2f\", $BYTES / 1048576 }")
echo "Elevation tiles written to $OUT (${MIB} MiB, ${BYTES} bytes)"
RECORD_FILE="$ROOT/docs/build-tickets/23-elevation-size-${PROFILE}.txt"
mkdir -p "$(dirname "$RECORD_FILE")"
echo "${PROFILE} extract $(date -u +%Y-%m-%dT%H:%M:%SZ): ${BYTES} bytes (${MIB} MiB) bbox=${BBOX} maxzoom=${MAX_ZOOM}" >"$RECORD_FILE"

"$SCRIPT_DIR/verify-elevation-tiles.sh" "$OUT"

echo "Recorded size in $RECORD_FILE"