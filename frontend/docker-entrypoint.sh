#!/bin/sh
set -e

LOCK_SHA=$(sha256sum package-lock.json | awk '{print $1}')
STAMP="node_modules/.package-lock.sha"

if [ ! -f "$STAMP" ] || [ "$(cat "$STAMP")" != "$LOCK_SHA" ]; then
  echo "package-lock.json changed; running npm ci..."
  npm ci
  echo "$LOCK_SHA" > "$STAMP"
fi

exec "$@"