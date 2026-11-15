#!/usr/bin/env bash
# Extract self-hosted Mapterhorn Terrarium elevation PMTiles (z0–12) for gata.
# Uses download.mapterhorn.com only at extract time — the running app never hotlinks it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=ensure-pmtiles.sh
source "$SCRIPT_DIR/ensure-pmtiles.sh"
export PATH="$SCRIPT_DIR/.bin:${PATH}"

ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="${TILES_DATA_DIR:-$ROOT/tiles/data}"
mkdir -p "$DATA_DIR"

PROFILE="${1:-dev}"
SOURCE_URL="${MAPTERHORN_SOURCE_URL:-https://download.mapterhorn.com/planet.pmtiles}"

# Same bboxes as fetch-tiles.sh (Britain and Ireland; Snowdonia dev).
BRITAIN_IRELAND_BBOX="${BRITAIN_IRELAND_BBOX:--10.854492,49.882893,1.912842,60.909393}"
DEV_BBOX="${DEV_BBOX:--4.15,52.95,-3.85,53.15}"

usage() {
	cat <<EOF
usage: $(basename "$0") [dev|full]

  dev   Extract Snowdonia-sized bbox into tiles/data/dev-elevation.pmtiles (default)
  full  Extract Britain and Ireland into tiles/data/britain-ireland-elevation.pmtiles (z0–12)

Environment:
  MAPTERNHORN_SOURCE_URL  Override planet PMTiles URL (default: download.mapterhorn.com/planet.pmtiles)
  TILES_DATA_DIR          Output directory (default: repo tiles/data)
  BRITAIN_IRELAND_BBOX    Override full-region bbox
  DEV_BBOX                Override dev bbox
  SKIP_BOUNDS_CHECK       Set to 1 to skip Britain/Ireland bounds test (dev extracts only)
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
	SKIP_BOUNDS_CHECK=1
	echo "Extracting dev elevation (Snowdonia bbox) to $OUT"
else
	OUT="$DATA_DIR/britain-ireland-elevation.pmtiles"
	BBOX="$BRITAIN_IRELAND_BBOX"
	echo "Extracting Britain and Ireland elevation (z0–12) to $OUT"
	echo "Ensure several GB free disk for download and rewrite."
fi

echo "Source: $SOURCE_URL"
echo "Bbox: $BBOX"

if command -v pmtiles >/dev/null 2>&1; then
	echo "=== dry-run size estimate ==="
	pmtiles extract --dry-run "$SOURCE_URL" --bbox="$BBOX" || true
fi

TMP_OUT="${OUT}.partial"
rm -f "$TMP_OUT"
pmtiles extract "$SOURCE_URL" "$TMP_OUT" --bbox="$BBOX"
mv "$TMP_OUT" "$OUT"

BYTES="$(wc -c <"$OUT" | tr -d ' ')"
HUMAN="$(du -h "$OUT" | cut -f1)"
echo "Measured size: $HUMAN ($BYTES bytes) — recorded in scripts/tiles/README.md for this profile."

SKIP_BOUNDS_CHECK="${SKIP_BOUNDS_CHECK:-0}" "$SCRIPT_DIR/verify-tiles.sh" "$OUT"

echo "Elevation tiles written to $OUT"
echo "Swap: replace the file on your tiles volume and reload Caddy; no app image rebuild needed."