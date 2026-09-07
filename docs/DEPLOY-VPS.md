# Deploying to the Linux VPS

This is the deployment path for the shared Ubuntu/Debian VPS where host-level
nginx owns ports 80/443 and reverse-proxies each project to its own loopback
port. Your other two projects already live here on **8081** and **8083**; this
app takes the next free one (**8082** by default).

The VPS is small, so **it never builds anything**. Images are built on your
machine and shipped as one compressed file.

```
  your machine                         the VPS
  ────────────                         ───────
  build-images.sh   ──  scp  ──▶       load-images.sh
  (Go + Vite build)   gms-images        (docker load)
                      .tar.gz                │
                                             ▼
                                        deploy.sh   ──▶  gms-postgres
                                        (compose up)      gms-migrate (one-shot)
                                                          gms-backend
                                                          gms-frontend  →  127.0.0.1:8082
                                                                              │
                                                       host nginx :443  ──────┘  (setup-nginx.sh)
```

Everything is in `scripts/`. All of it is idempotent and re-run safe; nothing
ever touches the `postgres_data` or `uploads_data` volumes.

---

## First deployment

### 1. On your machine — build and ship

```bash
./scripts/build-images.sh
# writes dist/gms-images.tar.gz  (~80–120 MB)

scp dist/gms-images.tar.gz  you@your-vps:/opt/gms/
```

Building for an ARM server instead: `PLATFORM=linux/arm64 ./scripts/build-images.sh`.
Server can't reach Docker Hub at all: add `INCLUDE_BASE=1` to bundle
`postgres:16-alpine` too.

### 2. On the VPS — one guided command

```bash
cd /opt/gms                       # a git clone of this repo
git pull                          # so scripts/ and compose match the images
./scripts/load-images.sh
./scripts/bootstrap-vps.sh
```

`bootstrap-vps.sh` installs Docker if missing, writes `.env` (generating
`JWT_SECRET` and `DB_PASSWORD`), picks a free loopback port, brings the stack
up, creates the first admin account, and — if nginx already owns 80/443 —
adds the `gms` server block and gets a Let's Encrypt certificate.

It prompts for the domain, the Let's Encrypt email, and the admin
username/password. Supply them up front to run unattended:

```bash
DOMAIN=gms.example.com LETSENCRYPT_EMAIL=you@example.com \
ADMIN_USERNAME=admin ADMIN_PASSWORD='a-strong-one' \
  ./scripts/bootstrap-vps.sh
```

That's it. `https://gms.example.com/health` should return `ok`.

---

## Every later deployment

### On your machine

```bash
./scripts/build-images.sh
scp dist/gms-images.tar.gz  you@your-vps:/opt/gms/
```

### On the VPS

```bash
cd /opt/gms
git pull
./scripts/load-images.sh
./scripts/deploy.sh
```

`deploy.sh` sees the freshly loaded images, runs `docker compose up -d --wait
--no-build`, waits for every healthcheck (and the one-shot `migrate` service
to exit 0), then prunes the now-dangling old layers. Pending migrations apply
automatically before the API starts. nginx is not involved in a redeploy.

---

## The pieces

| Script | Runs on | Does |
| --- | --- | --- |
| `build-images.sh` | your machine | builds `gms-backend:latest` + `gms-frontend:latest`, saves `dist/gms-images.tar.gz` |
| `load-images.sh` | VPS | `docker load` the bundle, verify architecture matches |
| `gen-secrets.sh` | VPS | fill `JWT_SECRET` / `DB_PASSWORD` in `.env` (never overwrites a real value) |
| `bootstrap-vps.sh` | VPS | first-time: Docker + `.env` + port + `up` + first admin + nginx |
| `deploy.sh` | VPS or dev | `compose up -d --wait`; uses prebuilt images if present, else builds |
| `setup-nginx.sh` | VPS (root) | write the `gms` nginx server block, obtain/renew the certificate |
| `lib.sh` | — | shared helpers (sourced, not run) |

The compose stack tags its images `gms-backend:latest` and
`gms-frontend:latest`. The `migrate` service reuses `gms-backend:latest` with a
different command, so only two images ship.

---

## `.env`

`bootstrap-vps.sh` creates it from `.env.example`. The keys that matter for this
layout:

| Key | Value | Why |
| --- | --- | --- |
| `HTTP_PORT` | `127.0.0.1:8082` | loopback bind — host nginx proxies here; never exposed publicly |
| `CORS_ALLOWED_ORIGINS` | `https://gms.example.com` | exact site origin; `*` is refused in production |
| `APP_ENV` | `production` | turns on the boot-time config checks |
| `JWT_SECRET` | generated, 64 chars | `< 32` or the example value refuses to boot |
| `DB_PASSWORD` | generated | — |
| `TRUSTED_PROXIES` | `172.16.0.0/12` (default) | covers the Docker bridge; host nginx reaches the container across it |
| `VITE_API_URL` | `/api/v1` (default) | baked into the frontend at build time; same-origin, so relative is right |

Pick a different loopback port with `APP_PORT=8090 ./scripts/bootstrap-vps.sh`,
or edit `HTTP_PORT` in `.env` and re-run `./scripts/deploy.sh` +
`sudo ./scripts/setup-nginx.sh`.

---

## nginx when it isn't ready yet

If ports 80/443 are held by **docker-proxy** (another project publishing them
straight from a container) rather than host nginx, `bootstrap-vps.sh` deploys
the stack but skips the proxy step and prints what to do: move that project to
a loopback port + host nginx server block too, then
`sudo ./scripts/setup-nginx.sh` here. Once host nginx owns 80/443, adding this
app — or any future project — is just one more server block.

`setup-nginx.sh` only ever writes `/etc/nginx/sites-*/gms`. It never reads or
reloads another project's config, and if its own config fails `nginx -t` it
removes it again before reloading so the other sites stay up. It also adds a
`limit_req` cushion (10 req/min) on `/api/v1/auth/login` and
`/api/v1/technician/login`.

---

## Operations

**First admin** (there is no self-signup):

```bash
docker compose exec backend /app/admin create \
  -username=admin -password='<strong>' -fullname='Admin' -email='admin@example.com'
docker compose exec backend /app/admin list
```

**Check migration state:**

```bash
docker compose run --rm migrate /app/migrate -cmd=status
```

**Reach Postgres from the host** (e.g. `psql`): it's published on
`127.0.0.1:${DB_HOST_PORT:-15432}` — loopback only, not the app's traffic path.

**Backups** — only two things hold state:

```bash
docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > db-$(date +%F).sql.gz

docker run --rm -v gms_uploads_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

**Logs:** `docker compose logs -f backend`

**Certificate renewal** is certbot's own systemd timer; the `--deploy-hook`
reloads nginx after a renewal. Nothing to schedule.
