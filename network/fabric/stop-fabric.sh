#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR/fabric"

echo "Stopping docker-compose..."
if command -v docker-compose >/dev/null 2>&1; then
  docker-compose -f ./docker-compose-fabric.yaml down --volumes --remove-orphans || true
else
  docker compose -f ./docker-compose-fabric.yaml down --volumes --remove-orphans || true
fi

echo "Done."
