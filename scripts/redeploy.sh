#!/usr/bin/env bash
# Tear the running containers down and bring the stack back up.
#
# Safe by design: this only ever removes CONTAINERS. The named volumes
# (postgres_data, uploads_data) are never touched - only `docker compose
# down -v` or `docker volume rm` can delete those, and this script does
# neither. Your database and uploaded files survive every run.
#
# Usage:
#   ./scripts/redeploy.sh              stop + remove containers, then deploy
#   ./scripts/redeploy.sh --images     also delete the gms-backend / gms-frontend
#                                      images, then STOP - run load-images.sh and
#                                      deploy.sh next. Use when a fresh bundle
#                                      needs to fully replace the old one.
#   ./scripts/redeploy.sh --data       ALSO wipe postgres_data and uploads_data
#                                      (asks for confirmation). Starts from an
#                                      empty database.
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
source scripts/lib.sh

mode="${1:-}"

case "$mode" in
  ""|--images|--data) ;;
  *) echo "Unknown option: $mode (use --images or --data)" >&2; exit 1 ;;
esac

if [[ "$mode" == "--data" ]]; then
  echo "This DELETES the database and all uploaded files for this project."
  read -r -p "Type the project name 'gms' to confirm: " reply
  [[ "$reply" == "gms" ]] || { echo "Aborted."; exit 1; }
  echo "==> Stopping containers and removing volumes"
  compose down -v --remove-orphans
else
  echo "==> Stopping and removing containers (volumes kept)"
  compose down --remove-orphans
fi

if [[ "$mode" == "--images" ]]; then
  echo "==> Removing app images"
  docker image rm -f gms-backend:latest gms-frontend:latest >/dev/null 2>&1 || true
  echo ""
  echo "Images gone. Load a fresh bundle and deploy:"
  echo "    ./scripts/load-images.sh"
  echo "    ./scripts/deploy.sh"
  exit 0
fi

echo ""
exec bash scripts/deploy.sh
