#!/usr/bin/env bash
# Redeploys the app in place. Same command for the very first deploy and every
# one after.
#
# It adapts to where it is run:
#   - prebuilt images already loaded (server, via load-images.sh)  -> --no-build
#   - no prebuilt images (a dev machine)                           -> build here
#
# Never touches postgres_data or uploads_data: only `docker compose down -v` or
# an explicit `docker volume rm` can delete those, and this does neither.
# Migrations are ledgered in schema_migrations and re-run safe, so the migrate
# service re-applying them on every deploy is expected and harmless.
#
# Usage: ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
source scripts/lib.sh

if [ ! -f .env ]; then
  echo ".env not found - copy .env.example to .env and fill in production values" >&2
  echo "first (or run ./scripts/bootstrap-vps.sh for a guided first-time setup)." >&2
  exit 1
fi

if images_present; then
  echo "==> Prebuilt images found (gms-backend:latest, gms-frontend:latest); skipping the build"
  BUILD_ARGS=(--no-build)
else
  echo "==> No prebuilt images; building here"
  echo "    On a small server this is slow and the frontend build may run out of"
  echo "    memory. Build on a bigger machine instead: ./scripts/build-images.sh"
  compose build
  BUILD_ARGS=()
fi

echo "==> Applying migrations and starting/recreating changed containers"
compose up -d "${BUILD_ARGS[@]}"

echo "==> Waiting for the backend health check"
# A manual loop rather than `up --wait`: the one-shot `migrate` container
# exiting 0 has historically tripped `--wait` up on some compose builds.
status="starting"
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Health.Status}}' gms-backend 2>/dev/null || echo starting)"
  [ "$status" = "healthy" ] && break
  sleep 2
done
if [ "$status" != "healthy" ]; then
  echo "!! backend did not report healthy within 60s - check: docker compose logs backend" >&2
  compose ps
  exit 1
fi

echo "==> Status"
compose ps

echo "==> Reclaiming disk from old, now-untagged image layers (leaves volumes and running containers alone)"
docker image prune -f >/dev/null

PORT="$(sed -n 's|^HTTP_PORT=||p' .env | head -1)"
PORT="${PORT:-127.0.0.1:8082}"
echo ""
echo "==> Done. Frontend is on ${PORT}."
echo "    If host nginx is not pointed at it yet: sudo ./scripts/setup-nginx.sh"
