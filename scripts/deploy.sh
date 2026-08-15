#!/usr/bin/env bash
# Rebuilds and redeploys the app in place. Run this every time you've made
# changes and want them live - it's the same command for the very first
# deploy and every one after.
#
# Never touches postgres_data or uploads_data: only `docker compose down -v`
# or an explicit `docker volume rm` can delete those, and this script does
# neither. Migrations are additive and re-run safe (ledgered in
# schema_migrations), so `docker compose up -d` re-applying them on every
# deploy is expected and harmless.
#
# Fast on repeat runs: Docker layer caching means only the layers after your
# last actual code/dependency change get rebuilt.
#
# Usage: ./scripts/deploy.sh

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo ".env not found - copy .env.example to .env and fill in production values first." >&2
  exit 1
fi

echo "==> Building images"
docker compose build

echo "==> Applying migrations, starting/recreating changed containers"
docker compose up -d

echo "==> Waiting for backend health check"
status="starting"
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Health.Status}}' gms-backend 2>/dev/null || echo starting)"
  [ "$status" = "healthy" ] && break
  sleep 2
done
if [ "$status" != "healthy" ]; then
  echo "!! backend did not report healthy within 60s - check: docker compose logs backend" >&2
  exit 1
fi

echo "==> Status"
docker compose ps

echo "==> Reclaiming disk from old, now-untagged image layers (does not touch volumes or running containers)"
docker image prune -f >/dev/null

echo "==> Done."
