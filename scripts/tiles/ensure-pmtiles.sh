#!/usr/bin/env bash
# Install the go-pmtiles CLI into scripts/tiles/.bin when it is not on PATH.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$SCRIPT_DIR/.bin"
VERSION="${PMTILES_VERSION:-1.31.2}"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
	x86_64 | amd64) ARCH_SUFFIX="x86_64" ;;
	aarch64 | arm64) ARCH_SUFFIX="arm64" ;;
	*)
		echo "Unsupported architecture: $ARCH" >&2
		exit 1
		;;
esac

if command -v pmtiles >/dev/null 2>&1; then
	# shellcheck disable=SC2310
	return 0 2>/dev/null || exit 0
fi

mkdir -p "$BIN_DIR"
TARGET="$BIN_DIR/pmtiles"

if [[ -x "$TARGET" ]]; then
	export PATH="$BIN_DIR:$PATH"
	# shellcheck disable=SC2310
	return 0 2>/dev/null || exit 0
fi

case "$OS" in
	linux)
		ARCHIVE="go-pmtiles_${VERSION}_Linux_${ARCH_SUFFIX}.tar.gz"
		URL="https://github.com/protomaps/go-pmtiles/releases/download/v${VERSION}/${ARCHIVE}"
		TMP="$(mktemp -d)"
		curl -fsSL "$URL" -o "$TMP/$ARCHIVE"
		tar -xzf "$TMP/$ARCHIVE" -C "$TMP"
		mv "$TMP/pmtiles" "$TARGET"
		chmod +x "$TARGET"
		rm -rf "$TMP"
		;;
	darwin)
		ARCHIVE="go-pmtiles-${VERSION}_Darwin_${ARCH_SUFFIX}.zip"
		URL="https://github.com/protomaps/go-pmtiles/releases/download/v${VERSION}/${ARCHIVE}"
		TMP="$(mktemp -d)"
		curl -fsSL "$URL" -o "$TMP/$ARCHIVE"
		unzip -q "$TMP/$ARCHIVE" -d "$TMP"
		mv "$TMP/pmtiles" "$TARGET"
		chmod +x "$TARGET"
		rm -rf "$TMP"
		;;
	*)
		echo "Unsupported OS: $OS — install pmtiles from https://github.com/protomaps/go-pmtiles" >&2
		exit 1
		;;
esac

export PATH="$BIN_DIR:$PATH"
echo "Installed pmtiles $VERSION to $TARGET"