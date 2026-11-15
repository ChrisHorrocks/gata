#!/usr/bin/env bash
# Download or extract Protomaps Basemap PMTiles for gata (Britain and Ireland, or a small dev bbox).
# Uses build.protomaps.com only at extract time — the running app never hotlinks it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=ensure-pmtiles.sh
source "$SCRIPT_DIR/ensure-pmtiles.sh"
export PATH="$SCRIPT_DIR/.bin:${PATH}"

ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="${TILES_DATA_DIR:-$ROOT/tiles/data}"
mkdir -p "$DATA_DIR"

PROFILE="${1:-dev}"
BUILD_DATE="${BUILD_DATE:-$(date -u +%Y%m%d)}"
SOURCE_URL="${PROTOMAPS_BUILD_URL:-https://build.protomaps.com/${BUILD_DATE}.pmtiles}"

# Bbox with margin around GB and NI (Britain and Ireland ~3.2 GB at z0–15).
BRITAIN_IRELAND_BBOX="${BRITAIN_IRELAND_BBOX:--10.854492,49.882893,1.912842,60.909393}"
# Snowdonia-sized dev extract (a few MB) for local dev and CI-sized disks.
DEV_BBOX="${DEV_BBOX:--4.15,52.95,-3.85,53.15}"

usage() {
	cat <<EOF
usage: $(basename "$0") [dev|full]

  dev   Extract a small bbox into tiles/data/dev-small.pmtiles (default)
  full  Extract Britain and Ireland into tiles/data/britain-ireland.pmtiles (~3.2 GB)

Environment:
  BUILD_DATE           Protomaps daily build date YYYYMMDD (default: today UTC)
  PROTOMAPS_BUILD_URL  Override source URL (default: build.protomaps.com/BUILD_DATE.pmtiles)
  TILES_DATA_DIR       Output directory (default: repo tiles/data)
  BRITAIN_IRELAND_BBOX Override full-region bbox
  DEV_BBOX             Override dev bbox
  SKIP_BOUNDS_CHECK    Set to 1 to skip Britain/Ireland bounds test (dev extracts only)
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
	OUT="$DATA_DIR/dev-small.pmtiles"
	BBOX="$DEV_BBOX"
	SKIP_BOUNDS_CHECK=1
	echo "Extracting dev tiles (small bbox) to $OUT"
else
	OUT="$DATA_DIR/britain-ireland.pmtiles"
	BBOX="$BRITAIN_IRELAND_BBOX"
	echo "Extracting Britain and Ireland tiles (~3.2 GB) to $OUT"
	echo "Ensure roughly 7+ GB free disk (source download cache + output)."
fi

echo "Source: $SOURCE_URL"
echo "Bbox: $BBOX"

TMP_OUT="${OUT}.partial"
rm -f "$TMP_OUT"
pmtiles extract "$SOURCE_URL" "$TMP_OUT" --bbox="$BBOX"
mv "$TMP_OUT" "$OUT"

SKIP_BOUNDS_CHECK="${SKIP_BOUNDS_CHECK:-0}" "$SCRIPT_DIR/verify-tiles.sh" "$OUT"

echo "Tiles written to $OUT"
echo "Swap: replace the file on your tiles volume and reload Caddy; no app image rebuild needed."