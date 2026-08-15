#!/usr/bin/env bash
# Issues (or renews) a Let's Encrypt certificate for a domain using the
# HTTP-01 webroot challenge, then installs it wherever nginx.conf expects it
# (C:/certs/<domain>-chain.pem and -key.pem, matching the naming already
# used for services.evinki.com).
#
# Webroot (not DNS-01) because the ArvanCloud API token available for this
# domain can't see it under the CDN product (confirmed: GET /cdn/4.0/domains
# lists 0 domains for this token, and /cdn/4.0/domains/evinki.com returns
# 403). Webroot needs nginx itself to already have a server block for the
# domain that serves /.well-known/acme-challenge/ from $NGINX_DIR/html - see
# the gms.evinki.com HTTP block in C:\nginx\conf\nginx.conf.
#
# Usage:
#   ./scripts/get-ssl-cert.sh <domain>
#
# Safe to re-run: acme.sh skips re-issuing if the cert isn't close to expiry.
# Run it from Git Bash (this repo's Bash tool uses the same one).

set -euo pipefail

DOMAIN="${1:?Usage: get-ssl-cert.sh <domain>}"

# Fixed, user-independent locations so the same paths work whether this is
# run interactively or later by a scheduled task running as SYSTEM.
ACME_HOME="${ACME_HOME:-/c/acme.sh}"
ACME_CONFIG_HOME="$ACME_HOME/data"
CERTS_DIR="${CERTS_DIR:-/c/certs}"
NGINX_DIR="${NGINX_DIR:-/c/nginx}"
WEBROOT="${WEBROOT:-$NGINX_DIR/html}"

ACME="$ACME_HOME/acme.sh"

if [ ! -x "$ACME" ]; then
  echo "==> acme.sh not found at $ACME_HOME, installing"
  tmp_src="$(mktemp -d)"
  git clone --depth 1 https://github.com/acmesh-official/acme.sh.git "$tmp_src"
  (
    cd "$tmp_src"
    ./acme.sh --install \
      --home "$ACME_HOME" \
      --config-home "$ACME_CONFIG_HOME" \
      --nocron
  )
  rm -rf "$tmp_src"
fi

if [ ! -d "$WEBROOT/.well-known/acme-challenge" ]; then
  mkdir -p "$WEBROOT/.well-known/acme-challenge"
fi

echo "==> Requesting certificate for $DOMAIN via HTTP-01 (webroot: $WEBROOT)"
# Let's Encrypt, not acme.sh's default of ZeroSSL - ZeroSSL requires an
# email-registered account (EAB) before it'll issue anything, which is an
# extra manual step this script would otherwise have to stop and ask for.
# --request-v4: this machine's IPv6 route is unroutable/blackholed, and
# Let's Encrypt's endpoint resolves to an IPv6 address first, so requests
# hang until timeout unless forced onto IPv4.
"$ACME" --issue --webroot "$WEBROOT" -d "$DOMAIN" --server letsencrypt --request-v4 \
  --home "$ACME_HOME" --config-home "$ACME_CONFIG_HOME"

echo "==> Installing certificate to $CERTS_DIR"
mkdir -p "$CERTS_DIR"
# The reload only succeeds when this runs with the same privilege as the
# nginx service (LocalSystem) - true for the SYSTEM-run renewal scheduled
# task, not for an interactive non-elevated shell. Don't let that failure
# abort the script: the cert files are already written by this point.
"$ACME" --install-cert -d "$DOMAIN" \
  --home "$ACME_HOME" --config-home "$ACME_CONFIG_HOME" \
  --fullchain-file "$CERTS_DIR/$DOMAIN-chain.pem" \
  --key-file "$CERTS_DIR/$DOMAIN-key.pem" \
  --reloadcmd "cd '$NGINX_DIR' && ./nginx.exe -s reload" \
  || echo "note: install-cert's reload step needs an elevated shell to reach the nginx service - that's expected here. Cert files are written regardless; reload nginx yourself (as Administrator) once its config points at them."

echo "==> Done: $CERTS_DIR/$DOMAIN-chain.pem and -key.pem are ready."
