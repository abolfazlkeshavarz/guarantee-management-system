#!/usr/bin/env bash
#
# Shared helpers sourced by the other deploy scripts. Not meant to be run
# directly.

# ---------------------------------------------------------------------------
# load_env <file>
#
# Loads a .env-style file WITHOUT `source`/`.`, which would execute every line
# as a shell command. Only well-formed KEY=VALUE lines are exported; anything
# else is warned about and skipped rather than crashing the caller.
# ---------------------------------------------------------------------------
load_env() {
  local file="${1:-.env}"
  if [[ ! -f "$file" ]]; then
    echo "Error: $file not found." >&2
    return 1
  fi
  set -a
  local line
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      export "$line"
    else
      echo "Warning: ignoring malformed line in $file: $line" >&2
    fi
  done < "$file"
  set +a
}

# ---------------------------------------------------------------------------
# port_in_use <port>
#
# True if anything - any process, containerised or not - already listens on
# this host port. docker-proxy publishes ports by binding them at the OS level
# just like a native service, so a container from an unrelated compose project
# is as much a collision as anything else, and `ss` sees both the same way.
# Falls back to a raw connect attempt only if `ss` is somehow missing.
# ---------------------------------------------------------------------------
port_in_use() {
  local port="$1"

  if command -v ss >/dev/null 2>&1; then
    ss -Htln "( sport = :$port )" 2>/dev/null | grep -q .
    return $?
  fi

  (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && { exec 3>&-; return 0; }
  return 1
}

# ---------------------------------------------------------------------------
# find_free_port <start>
#
# First free port at or above <start>. Used to pick a loopback port for the
# frontend container so deployment proceeds automatically instead of failing
# on "port is already allocated" and leaving the operator to guess a number.
# ---------------------------------------------------------------------------
find_free_port() {
  local port="${1:-8082}"
  while port_in_use "$port"; do
    port=$((port + 1))
  done
  echo "$port"
}

# ---------------------------------------------------------------------------
# port_owner <port>
#
# Name of the process listening on a host port ("nginx", "docker-proxy", ...),
# or empty if nothing is. "Something has 443" is two situations with opposite
# fixes:
#   nginx        - good, that is the reverse proxy we want; just add a site
#   docker-proxy - a container published it, so host nginx cannot bind it and
#                  that has to be resolved first
# Needs root to see process names for sockets owned by other users.
# ---------------------------------------------------------------------------
port_owner() {
  local port="$1"
  command -v ss >/dev/null 2>&1 || return 0

  ss -Htlnp "( sport = :$port )" 2>/dev/null \
    | grep -oE 'users:\(\("[^"]+"' \
    | head -1 \
    | sed -E 's/.*"([^"]+)"/\1/'
}

# ---------------------------------------------------------------------------
# compose <args...>
#
# `docker compose` with both compose files, from the project root. Every script
# calls the stack through this so the file list stays in one place.
# ---------------------------------------------------------------------------
compose() {
  docker compose "$@"
}

# ---------------------------------------------------------------------------
# images_present
#
# True only if both prebuilt runtime images are already loaded, so a caller
# can decide whether to build or run --no-build.
# ---------------------------------------------------------------------------
images_present() {
  docker image inspect gms-backend:latest  >/dev/null 2>&1 \
    && docker image inspect gms-frontend:latest >/dev/null 2>&1
}
