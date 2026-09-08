#!/usr/bin/env bash
#
# Zero-to-deployed on a fresh (or already-in-use) Ubuntu/Debian VPS: installs
# Docker, creates .env, picks a free loopback port, brings the stack up, and
# - if ports 80/443 belong to nginx - wires up the reverse proxy and TLS.
#
# It adapts to a server that already runs other projects rather than failing
# on "port is already allocated".
#
# Usage (from the project root, after git clone):
#   ./scripts/bootstrap-vps.sh
#
# Supply values up front to skip the prompts:
#   DOMAIN=gms.example.com ADMIN_USERNAME=admin ./scripts/bootstrap-vps.sh
#
# The script re-execs itself with sudo; no need to prefix it.
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
source scripts/lib.sh

# ------------------------------------------------------------- elevate to root
if [[ "$(id -u)" != "0" ]]; then
  echo "==> Root access is required to install Docker; re-running with sudo"
  exec sudo -E bash "$0" "$@"
fi

REAL_USER="${SUDO_USER:-root}"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script targets Ubuntu/Debian (apt) only." >&2
  exit 1
fi

# --------------------------------------------------------- base packages
echo "==> Installing base packages"
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl gnupg openssl git

# --------------------------------------------------------------- Docker Engine
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker Engine"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  # shellcheck disable=SC1091
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  echo "    Docker installed."
else
  echo "==> Docker is already installed (shared with your other projects - fine,"
  echo "    Docker runs any number of independent compose projects side by side)"
fi

if [[ "$REAL_USER" != "root" ]] && ! id -nG "$REAL_USER" | grep -qw docker; then
  echo "==> Adding user $REAL_USER to the docker group"
  usermod -aG docker "$REAL_USER"
  echo "    Note: log out and back in to run docker without sudo."
fi

# --------------------------------------------------------------- domain / admin
if [[ -z "${DOMAIN:-}" ]]; then
  read -r -p "Domain this app will be reachable at (A record already pointing here): " DOMAIN
fi
: "${DOMAIN:?DOMAIN is required}"

if [[ -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  read -r -p "Email for Let's Encrypt expiry notices (blank for admin@${DOMAIN}): " LETSENCRYPT_EMAIL
  LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-admin@${DOMAIN}}"
fi

if [[ -z "${ADMIN_USERNAME:-}" ]]; then
  read -r -p "Username for the first administrator account: " ADMIN_USERNAME
fi
: "${ADMIN_USERNAME:?ADMIN_USERNAME is required}"

if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  while true; do
    read -r -s -p "Password for the first administrator (min 8 characters): " ADMIN_PASSWORD; echo
    if [[ ${#ADMIN_PASSWORD} -lt 8 ]]; then
      echo "  Too short. Try again."; continue
    fi
    read -r -s -p "Confirm password: " ADMIN_PASSWORD_CONFIRM; echo
    [[ "$ADMIN_PASSWORD" == "$ADMIN_PASSWORD_CONFIRM" ]] && break
    echo "  Passwords did not match. Try again."
  done
  unset ADMIN_PASSWORD_CONFIRM
fi
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD is required}"

ADMIN_FULLNAME="${ADMIN_FULLNAME:-System Administrator}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${DOMAIN}}"

# --------------------------------------------------------- proxy port
echo "==> Choosing a loopback port for this app"
APP_PORT="${APP_PORT:-$(find_free_port 8082)}"
echo "    127.0.0.1:${APP_PORT}  (your other projects are on 8081 and 8083)"

# Whether host nginx can be set up now depends on who holds 80/443.
PROXY_READY=1
for p in 80 443; do
  owner="$(port_owner "$p" || true)"
  if [[ -n "$owner" && "$owner" != "nginx" ]]; then
    PROXY_READY=0
    echo ""
    echo "    Note: port ${p} is held by \"${owner}\", not nginx. The stack will"
    echo "    still be deployed; the reverse-proxy step is skipped - see the"
    echo "    instructions printed at the end."
  fi
done

# ------------------------------------------------------------------- .env
echo "==> Creating .env"
if [[ ! -f .env ]]; then
  cp .env.example .env
fi
bash scripts/gen-secrets.sh

# HTTP_PORT carries the bind address too.
sed -i "s|^HTTP_PORT=.*|HTTP_PORT=127.0.0.1:${APP_PORT}|" .env
# Same-origin behind nginx: the only origin the API needs to allow is the site.
sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://${DOMAIN}|" .env
grep -q '^APP_ENV=' .env && sed -i "s|^APP_ENV=.*|APP_ENV=production|" .env || echo "APP_ENV=production" >> .env

if [[ "$REAL_USER" != "root" ]]; then
  chown "$REAL_USER":"$REAL_USER" .env
fi
chmod 600 .env

# --------------------------------------------------------------- deploy
if images_present; then
  echo "==> Prebuilt images found; skipping the build"
else
  echo "==> No prebuilt images found."
  echo "    On a small VPS the frontend build can run out of memory. The"
  echo "    supported path is to build on your own machine and ship a bundle:"
  echo "        ./scripts/build-images.sh          (on your machine)"
  echo "        scp dist/gms-images.tar.gz  user@server:$(pwd)/"
  echo "        ./scripts/load-images.sh           (here), then re-run this"
  read -r -p "    Build here now anyway? [y/N] " reply
  [[ "$reply" == "y" || "$reply" == "Y" ]] || exit 1
fi

bash scripts/deploy.sh

# ------------------------------------------------------- first admin account
echo ""
echo "==> Creating the first administrator (${ADMIN_USERNAME})"
if docker compose exec -T backend /app/admin create \
      -username="$ADMIN_USERNAME" -password="$ADMIN_PASSWORD" \
      -fullname="$ADMIN_FULLNAME" -email="$ADMIN_EMAIL" 2>&1 | sed 's/^/    /'; then
  echo "    Created."
elif docker compose exec -T backend /app/admin reset-password \
      -username="$ADMIN_USERNAME" -password="$ADMIN_PASSWORD" 2>&1 | sed 's/^/    /'; then
  # An account with this name already existed (e.g. the placeholder row from an
  # older schema). Set its password to the one just entered so there is a
  # working way in rather than a silent "skipped".
  echo "    An account named ${ADMIN_USERNAME} already existed; its password was set to the one you entered."
else
  echo "    Could not create or update ${ADMIN_USERNAME}."
  echo "    Do it by hand:  docker compose exec backend /app/admin create -username=... -password=..."
  echo "    List accounts:  docker compose exec backend /app/admin list"
fi

# --------------------------------------------------- reverse proxy + SSL
if [[ "$PROXY_READY" == "1" ]]; then
  echo "==> Setting up host nginx and the certificate for ${DOMAIN}"
  DOMAIN="$DOMAIN" \
  APP_PORT_OVERRIDE="$APP_PORT" \
  LETSENCRYPT_EMAIL="$LETSENCRYPT_EMAIL" \
  STAGING="${STAGING:-0}" \
    bash scripts/setup-nginx.sh
else
  cat <<EOF

------------------------------------------------------------------------
The app is running on 127.0.0.1:${APP_PORT}, but the reverse-proxy step was
SKIPPED because ports 80/443 are held by something other than nginx.

This layout expects host nginx to own 80/443 and route each subdomain to its
project's loopback port. To finish:

1) Move whatever holds 80/443 behind host nginx too. If it is a Docker
   project publishing those ports from a container, change its compose file
   from  ports: ["80:80","443:443"]  to  ports: ["127.0.0.1:8081:80"], drop
   its 443 mapping, then  docker compose up -d.
2) Re-run the proxy setup for this app:  sudo ./scripts/setup-nginx.sh
3) Give each other project its own server block pointing at its loopback
   port, and let the host certbot handle its certificate too.
------------------------------------------------------------------------
EOF
fi

echo ""
echo "================================================================"
echo " Admin username: ${ADMIN_USERNAME}"
echo " (password as entered; change it once you have signed in)"
echo "================================================================"
