#!/usr/bin/env bash
#
# Fills the generated secrets in .env: JWT_SECRET and DB_PASSWORD. An existing
# real value is left alone, so this is safe to re-run and will never rotate a
# key that is already protecting live data. Placeholder values from
# .env.example (CHANGE_ME..., the example JWT key) ARE replaced.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env found. Copy .env.example to .env first." >&2
  exit 1
fi

random_hex() {   # DB_PASSWORD: alnum only, safe in a URL and a psql prompt
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

random_secret() { # JWT_SECRET: needs >=32 chars; strip URL-unsafe base64 chars
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-64
  else
    head -c 48 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# is_placeholder <current-value>
is_placeholder() {
  local v="$1"
  [[ -z "$v" ]] && return 0
  case "$v" in
    CHANGE_ME*|*change-in-production*|your-super-secret*|Whoknowwho) return 0 ;;
  esac
  return 1
}

set_secret() {
  local key="$1" value="$2" current
  current="$(sed -n "s|^${key}=||p" .env | head -1)"

  if ! is_placeholder "$current"; then
    echo "  ${key} already set to a real value, leaving it alone"
    return
  fi

  if grep -qE "^${key}=" .env; then
    # Portable in-place edit: BSD and GNU sed disagree about -i.
    sed "s|^${key}=.*|${key}=${value}|" .env > .env.tmp && mv .env.tmp .env
  else
    echo "${key}=${value}" >> .env
  fi
  echo "  ${key} generated"
}

echo "Filling secrets in .env"
set_secret JWT_SECRET  "$(random_secret)"
set_secret DB_PASSWORD "$(random_hex)"

echo ""
echo "Done. Review .env - in particular CORS_ALLOWED_ORIGINS and the SMS_* keys -"
echo "before deploying."
