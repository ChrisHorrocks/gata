#!/usr/bin/env bash
# Vendor Protomaps basemaps fonts and sprites for local serving (never hotlink protomaps.github.io).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="${TILES_DATA_DIR:-$ROOT/tiles/data}/basemaps-assets"
REPO_URL="${BASEMAPS_ASSETS_REPO:-https://github.com/protomaps/basemaps-assets.git}"
REF="${BASEMAPS_ASSETS_REF:-main}"

if [[ -d "$DEST/.git" ]]; then
	echo "Updating basemaps-assets in $DEST"
	git -C "$DEST" fetch --depth 1 origin "$REF"
	git -C "$DEST" checkout FETCH_HEAD
else
	rm -rf "$DEST"
	echo "Cloning basemaps-assets into $DEST"
	git clone --depth 1 --branch "$REF" "$REPO_URL" "$DEST"
fi

for required in fonts sprites; do
	if [[ ! -d "$DEST/$required" ]]; then
		echo "Missing $required/ in basemaps-assets checkout" >&2
		exit 1
	fi
done

echo "Basemaps assets ready under $DEST"