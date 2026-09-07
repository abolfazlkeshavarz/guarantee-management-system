#!/usr/bin/env bash
#
# Publishes this app on one subdomain via host-level nginx, with a Let's
# Encrypt certificate, on a server that also serves other projects on other
# subdomains (the ones already on 8081 and 8083).
#
# The design: nginx on the HOST owns 80/443 and routes by subdomain; every
# project runs in Docker bound to a loopback port and is reached only through
# that proxy. Adding a project is then just another server block, and nothing
# is exposed to the internet except nginx.
#
# Only ever writes its own site file (/etc/nginx/sites-*/gms). Other projects'
# configs are never read or reloaded out from under them, and if this config
# would break nginx it is removed again before reloading.
#
# Usage (as root, from the project root):
#   ./scripts/setup-nginx.sh
#
# Non-interactive:
#   DOMAIN=gms.example.com LETSENCRYPT_EMAIL=you@example.com \
#     ./scripts/setup-nginx.sh
#
# Other options:
#   STAGING=1      use Let's Encrypt staging (untrusted certs, no rate limit)
#   SKIP_CERT=1    write the HTTP config only; do not call certbot
#   RENDER_ONLY=1  print the configs to stdout and exit, changing nothing
set -euo pipefail

cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
source scripts/lib.sh

SITE_NAME="${SITE_NAME:-gms}"
WEBROOT="${WEBROOT:-/var/www/certbot}"
AVAILABLE="/etc/nginx/sites-available/${SITE_NAME}"
ENABLED="/etc/nginx/sites-enabled/${SITE_NAME}"

# ------------------------------------------------------------------ inputs
if [[ -f .env ]]; then
  load_env .env >/dev/null 2>&1 || true
fi

# HTTP_PORT is "127.0.0.1:8082" (or just "8082"); the proxy target is the port.
APP_PORT="${APP_PORT_OVERRIDE:-${HTTP_PORT:-}}"
APP_PORT="${APP_PORT##*:}"
APP_PORT="${APP_PORT:-8082}"

if [[ -z "${DOMAIN:-}" ]]; then
  read -r -p "Subdomain to serve the app on (e.g. gms.example.com): " DOMAIN
fi
: "${DOMAIN:?DOMAIN is required}"

if [[ "${SKIP_CERT:-0}" != "1" && "${RENDER_ONLY:-0}" != "1" && -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  read -r -p "Email for Let's Encrypt expiry notices: " LETSENCRYPT_EMAIL
fi

# --------------------------------------------------------- config rendering
#
# Two configs, because of a chicken-and-egg: the HTTPS block references a
# certificate file and nginx refuses to start if it is missing - but certbot
# needs a working nginx on port 80 to answer the ACME challenge before it can
# issue one. So: serve HTTP only, get the certificate, then rewrite with HTTPS.

# "http2 on;" arrived in nginx 1.25.1; before that it was a listen parameter.
# Ubuntu 22.04 ships 1.18, 24.04 ships 1.24, so the form has to be chosen at
# runtime. Omitted entirely if the version cannot be read.
http2_directive() {
  local v major minor patch
  v="$(nginx -v 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || true)"
  [[ -z "$v" ]] && return 0
  IFS=. read -r major minor patch <<< "$v"
  if (( major > 1 || (major == 1 && minor > 25) || (major == 1 && minor == 25 && patch >= 1) )); then
    echo "    http2 on;"
  else
    echo "    # http2 enabled via the listen directive below (nginx ${v})"
  fi
}
http2_listen_suffix() {
  local v major minor patch
  v="$(nginx -v 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || true)"
  [[ -z "$v" ]] && return 0
  IFS=. read -r major minor patch <<< "$v"
  if (( major > 1 || (major == 1 && minor > 25) || (major == 1 && minor == 25 && patch >= 1) )); then
    echo ""
  else
    echo " http2"
  fi
}

render_http_config() {
  cat <<EOF
# ${SITE_NAME} - managed by scripts/setup-nginx.sh
# HTTP only: serves the ACME challenge, redirects everything else to HTTPS.

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
}

render_https_config() {
  local h2_listen h2_directive
  h2_listen="$(http2_listen_suffix)"
  h2_directive="$(http2_directive)"

  cat <<EOF
# ${SITE_NAME} - managed by scripts/setup-nginx.sh
# Reverse proxy to the frontend container on 127.0.0.1:${APP_PORT}.
# Regenerate with: ./scripts/setup-nginx.sh

# Brute-force cushion for the two login endpoints. Kept here (not in the app)
# so it applies before a request ever reaches a container.
limit_req_zone \$binary_remote_addr zone=${SITE_NAME}_login:10m rate=10r/m;

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl${h2_listen};
    listen [::]:443 ssl${h2_listen};
${h2_directive}
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Keep >= MAX_UPLOAD_SIZE in .env (10 MiB default) plus multipart overhead.
    # The container's own nginx also caps this at 12m.
    client_max_body_size 12m;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy settings are identical for every location; only the two login
    # routes add a rate limit on top. Set once here so every location inherits
    # them - in particular proxy_http_version 1.1: without it nginx talks
    # HTTP/1.0 to the upstream, and the frontend container's nginx answers 400
    # to an HTTP/1.0 POST that carries a body (which is every login request).
    # Do not add nginx's stock proxy_params include here either: it sets its
    # own Host header, which together with the explicit one below would be sent
    # twice and also rejected as a bad request.
    proxy_http_version 1.1;
    proxy_set_header Host              \$host;
    proxy_set_header X-Real-IP         \$remote_addr;
    proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 300;
    proxy_send_timeout 300;

    location = /api/v1/auth/login {
        limit_req zone=${SITE_NAME}_login burst=5 nodelay;
        proxy_pass http://127.0.0.1:${APP_PORT};
    }

    location = /api/v1/technician/login {
        limit_req zone=${SITE_NAME}_login burst=5 nodelay;
        proxy_pass http://127.0.0.1:${APP_PORT};
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
    }
}
EOF
}

if [[ "${RENDER_ONLY:-0}" == "1" ]]; then
  echo "########## phase 1: HTTP only (pre-certificate) ##########"
  render_http_config
  echo ""
  echo "########## phase 2: full HTTPS ##########"
  render_https_config
  exit 0
fi

# -------------------------------------------------------------- root check
if [[ "$(id -u)" != "0" ]]; then
  echo "==> Root is required to configure nginx; re-running with sudo"
  exec sudo -E bash "$0" "$@"
fi

# ------------------------------------------------------- port availability
echo "==> Checking ports 80 and 443"
for p in 80 443; do
  owner="$(port_owner "$p" || true)"
  if [[ -z "$owner" ]]; then
    port_in_use "$p" && echo "    Port ${p}: in use (owner unknown)" || echo "    Port ${p}: free"
    continue
  fi
  if [[ "$owner" == "nginx" ]]; then
    echo "    Port ${p}: nginx (good - this is the proxy we add a site to)"
    continue
  fi
  cat >&2 <<EOF

Error: port ${p} is held by "${owner}", not nginx.

  Host-level nginx cannot bind a port another process already has. If
  "${owner}" is docker-proxy, a container published that port - almost
  certainly another project's own web server. With this design that project
  should also move behind the shared proxy:

    1. In its docker-compose.yml, change the web service from
         ports: ["80:80", "443:443"]
       to a loopback port, e.g.
         ports: ["127.0.0.1:8081:80"]
       and drop its 443 mapping.
    2. Recreate it:  docker compose up -d
    3. Give it a server block in host nginx like this script writes, and move
       its certificate to the host certbot.
    4. Re-run this script.
EOF
  exit 1
done

# --------------------------------------------------------------- packages
if ! command -v nginx >/dev/null 2>&1; then
  echo "==> Installing nginx"
  apt-get update
  apt-get install -y --no-install-recommends nginx
  systemctl enable --now nginx
else
  echo "==> nginx already installed"
fi

if [[ "${SKIP_CERT:-0}" != "1" ]] && ! command -v certbot >/dev/null 2>&1; then
  echo "==> Installing certbot"
  apt-get install -y --no-install-recommends certbot
fi

mkdir -p "$WEBROOT"

# ----------------------------------------------------- install site helper
install_site() {
  local body="$1" label="$2"
  echo "==> Writing ${AVAILABLE} (${label})"
  printf '%s\n' "$body" > "$AVAILABLE"
  ln -sfn "$AVAILABLE" "$ENABLED"

  if ! nginx -t 2>&1 | sed 's/^/    /'; then
    echo "" >&2
    echo "Error: nginx rejected the ${label} config; removing it so the other" >&2
    echo "       sites on this server keep working." >&2
    rm -f "$ENABLED"
    nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
    exit 1
  fi
  systemctl reload nginx
  echo "    nginx reloaded"
}

CERT_LIVE="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

if [[ -f "$CERT_LIVE" ]]; then
  echo "==> Certificate for ${DOMAIN} already exists; keeping it"
  install_site "$(render_https_config)" "HTTPS"
elif [[ "${SKIP_CERT:-0}" == "1" ]]; then
  echo "==> SKIP_CERT=1; installing the HTTP-only config"
  install_site "$(render_http_config)" "HTTP only"
  echo ""
  echo "No certificate requested. App is on http://${DOMAIN} only."
  exit 0
else
  install_site "$(render_http_config)" "HTTP only, pre-certificate"

  echo ""
  echo "==> Checking ${DOMAIN} resolves to this server"
  server_ip="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || echo '')"
  domain_ip="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || echo '')"
  if [[ -n "$server_ip" && -n "$domain_ip" && "$server_ip" != "$domain_ip" ]]; then
    echo "    Warning: ${DOMAIN} resolves to ${domain_ip}, but this server is ${server_ip}."
    read -r -p "    Continue anyway? [y/N] " reply
    [[ "$reply" == "y" || "$reply" == "Y" ]] || exit 1
  else
    echo "    OK"
  fi

  STAGING_FLAG=""
  [[ "${STAGING:-0}" == "1" ]] && STAGING_FLAG="--staging"

  echo ""
  echo "==> Requesting a certificate for ${DOMAIN}"
  certbot certonly --webroot -w "$WEBROOT" \
    ${STAGING_FLAG} \
    -d "$DOMAIN" \
    --email "$LETSENCRYPT_EMAIL" \
    --agree-tos --no-eff-email \
    --non-interactive \
    --deploy-hook "systemctl reload nginx"

  install_site "$(render_https_config)" "HTTPS"
fi

# ------------------------------------------------------------------ verify
echo ""
echo "==> Verifying"
if curl -fsS --max-time 10 "https://${DOMAIN}/health" 2>/dev/null | grep -q 'ok'; then
  echo "    https://${DOMAIN}/health -> ok"
else
  echo "    Could not reach https://${DOMAIN}/health yet."
  echo "    If the containers are not up: ./scripts/deploy.sh"
fi

cat <<EOF

================================================================
 App is served at https://${DOMAIN}

 nginx site:  ${AVAILABLE}
 proxying to: 127.0.0.1:${APP_PORT}
 renewal:     certbot's own timer; nginx reloads via the deploy-hook

 To add another project later, give it its own loopback port and its own
 server block the same way - nothing here is exclusive to this app.
================================================================
EOF
