#!/usr/bin/env bash
#
# Builds the two runtime images HERE (a development machine) and packs them
# into a single tarball to carry to the server, so the server never compiles
# anything.
#
# Why this exists: the frontend's Vite build wants ~1.5 GB of RAM and the Go
# build is CPU-bound. On a small VPS - 1 core, little memory - building in
# place is slow at best and gets OOM-killed at worst. Build where the
# resources are, ship the result.
#
# Usage (on your own machine, from the project root):
#   ./scripts/build-images.sh
#
# Options (environment variables):
#   PLATFORM=linux/arm64          target architecture, if the server is not x86-64
#   INCLUDE_BASE=1                also bundle postgres:16-alpine, for a server
#                                that cannot pull from Docker Hub at all
#   OUT=path/to/file.tar.gz       where to write the bundle
#   VITE_API_URL=/api/v1          baked into the frontend at build time; the
#                                default is right for the same-origin nginx setup
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
source scripts/lib.sh

PLATFORM="${PLATFORM:-linux/amd64}"
OUT="${OUT:-dist/gms-images.tar.gz}"
INCLUDE_BASE="${INCLUDE_BASE:-0}"

# Kept in step with docker-compose.yml so a version bump there is picked up here.
BASE_IMAGES=(postgres:16-alpine)

IMAGES=(gms-backend:latest gms-frontend:latest)

echo "==> Building images for ${PLATFORM}"
echo ""

# compose refuses to interpolate the file at all while required vars (DB_*,
# JWT_SECRET, CORS_ALLOWED_ORIGINS) are unset. Their *values* never reach the
# images - they are runtime settings - so a throwaway .env copied from the
# example is enough, and is cleaned up afterwards rather than making the
# operator hand-craft one on a machine that will never run the stack.
TEMP_ENV=0
if [[ ! -f .env ]]; then
  TEMP_ENV=1
  cp .env.example .env
  echo "    (using a temporary .env just to satisfy compose interpolation;"
  echo "     nothing from it is baked into the images)"
  echo ""
fi
cleanup() { [[ "$TEMP_ENV" == "1" ]] && rm -f .env; }
trap cleanup EXIT

DOCKER_DEFAULT_PLATFORM="$PLATFORM" compose build

echo ""
echo "==> Verifying the built images really are ${PLATFORM}"
# A mismatch here does not fail the build - it produces images that load fine
# on the server and then die at startup with a bare "exec format error", which
# is a confusing thing to debug remotely. Cheaper to catch now.
want_os="${PLATFORM%%/*}"
want_arch="${PLATFORM##*/}"
for img in "${IMAGES[@]}"; do
  got="$(docker image inspect "$img" --format '{{.Os}}/{{.Architecture}}')"
  if [[ "$got" != "${want_os}/${want_arch}" ]]; then
    echo "Error: ${img} is ${got}, but ${PLATFORM} was requested." >&2
    echo "       Loading this on the server would fail at runtime with" >&2
    echo "       \"exec format error\". Check your Docker buildx setup." >&2
    exit 1
  fi
  echo "    ${img}: ${got}"
done

if [[ "$INCLUDE_BASE" == "1" ]]; then
  echo ""
  echo "==> Also pulling base images for ${PLATFORM} (INCLUDE_BASE=1)"
  for img in "${BASE_IMAGES[@]}"; do
    docker pull --platform "$PLATFORM" "$img"
  done
  IMAGES+=("${BASE_IMAGES[@]}")
fi

echo ""
echo "==> Packing into ${OUT}"
mkdir -p "$(dirname "$OUT")"
# gzip -1: these layers are mostly already-compressed content, so higher
# levels cost a lot of time for very little extra saving.
docker save "${IMAGES[@]}" | gzip -1 > "$OUT"

size="$(du -h "$OUT" | cut -f1)"
echo ""
echo "================================================================"
echo " Built: ${size}  ->  ${OUT}"
echo "================================================================"
echo ""
echo "Next, copy it to the server and load it there:"
echo ""
echo "  scp ${OUT} YOUR_USER@YOUR_SERVER:/opt/gms/"
echo "  ssh YOUR_USER@YOUR_SERVER"
echo "  cd /opt/gms && ./scripts/load-images.sh && ./scripts/deploy.sh"
echo ""
if [[ "$INCLUDE_BASE" != "1" ]]; then
  echo "This bundle contains only the two images that must be built."
  echo "postgres:16-alpine is pulled from Docker Hub on the server - very likely"
  echo "already present there if another project uses it. If the server cannot"
  echo "reach Docker Hub at all, rebuild with INCLUDE_BASE=1."
  echo ""
fi
