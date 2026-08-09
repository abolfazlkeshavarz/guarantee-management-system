# Guarantee Management System — completion & deployment guide

Copy the files in this bundle over the matching paths in your repo, apply the
four small manual edits in section 2, then follow the runbook in section 4.

---

## 1. What was missing or broken

### Blocked deployment outright
| Problem | Fix |
| --- | --- |
| `docker/nginx.conf` was referenced by `Dockerfile.frontend` but never committed — the frontend image could not build | Added `docker/nginx.conf` (SPA fallback, `/api` + `/uploads` proxy, caching, security headers) |
| `docker/Dockerfile.backend` used `golang:1.26.5-alpine`, an image tag that does not exist | Pinned to `golang:1.24-alpine`; also builds the migrate binary, drops to a non-root user, adds a healthcheck |
| `node:20-alpine` is below Vite 8's `^20.19 \|\| >=22.12` floor | Moved to `node:22-alpine` |
| `docker-compose.yml` shipped `Whoknowwho` and the example JWT key as defaults | All secrets now come from `.env` with `:?` guards; nothing falls back silently |
| No migration step in compose | Added a one-shot `migrate` service the backend waits on |

### Dead links in the UI
| Problem | Fix |
| --- | --- |
| Sidebar linked to `/settings`, but no route or page existed → 404 | New `SettingsPage` + route |
| Technician nav linked to `/technician/profile`, same story | New `TechnicianProfilePage` + route |
| Header "Profile" and "Settings" menu items did nothing | Both navigate to `/settings` |

### Functional bugs
| Problem | Fix |
| --- | --- |
| `authService.changePassword` sent `{oldPassword, newPassword}`; the handler binds `old_password`/`new_password` — every attempt failed validation | Corrected payload |
| `Admin` type was camelCase while the API returns snake_case, so `admin.fullName` was always `undefined` and the header showed a placeholder | Type and `Header` fixed |
| Technicians had no way to change their password | New `POST /technician/change-password` (backend + UI) |
| `products.Update` ignored `code_prefix`, `code_format`, `code_pattern`, `default_guarantee_months`, `golden_guarantee_months` — editing them silently did nothing | All handled, with prefix-uniqueness and golden ≤ total validation |
| `products.mapToDTO` omitted those same fields, so the edit dialog opened blank and saved the blanks back | DTO now carries them |
| Migrations re-ran on every `migrate up` (no ledger); `014`'s `ADD CONSTRAINT` had no guard and failed on the second run | `schema_migrations` table, transactional apply, `migrate status`; `011` and `014` made idempotent |
| `011_add_product_code_pattern.sql` was never executed — the glob only matches `*.up.sql` | Renamed and rewritten idempotently |
| 401 handler cleared only the admin token and always redirected to `/login`, stranding technicians | Clears both, redirects to the right sign-in page |

### Production hardening
- **CORS**: was `Access-Control-Allow-Origin: *` together with `Allow-Credentials: true` — a combination browsers reject and that would expose the API to any site. Now an explicit allowlist.
- **Config validation**: production boot fails if `JWT_SECRET` is the example value or under 32 chars, if `DB_PASSWORD` is empty, or if CORS is `*`.
- **Graceful shutdown**: the old `main.go` logged "shutting down" and exited immediately, cutting in-flight requests. Now a real `server.Shutdown` with a 15s drain.
- **Trusted proxies**: Gin trusted every proxy by default; now driven by `TRUSTED_PROXIES`.
- **`/ready`**: new probe that actually pings the database.
- **`.dockerignore`**: keeps `node_modules`, local `.env` files and uploaded customer documents out of the build context.

### ⚠️ Rotate these credentials before going live
The repository contains real secrets in its history:
- `Whoknowwho` appears in `docker-compose.yml`, `backend/.env.example`, `backend/Makefile`, `backend/health-check.ps1`.
- `.claude/settings.local.json` contains a **valid signed JWT** and a `PGPASSWORD` export.

Change the database password, generate a fresh `JWT_SECRET` (which invalidates
that token), and remove `.claude/settings.local.json` from version control.

---

## 2. Manual edits (four small ones)

**a. `backend/go.mod` — line 3**

`go 1.26.5` is not a released toolchain, so the Docker build fails to resolve it.

```diff
-go 1.26.5
+go 1.24
```

**b. `backend/internal/modules/guarantees/handler.go` — `UploadFile`**

Absolute URLs built from `APP_URL` break the moment the API is not on
`localhost:8080`. Return a relative path and let the frontend's existing
`resolveFileUrl` helper handle it.

```diff
-	fileURL := fmt.Sprintf("%s/uploads/%s", strings.TrimRight(h.appURL, "/"), filepath.ToSlash(info.Path))
+	fileURL := "/uploads/" + filepath.ToSlash(info.Path)
```

Then drop the now-unused `fmt` and `strings` imports (`filepath` is still used).

**c. Delete two superseded files**

```bash
rm backend/migrations/011_add_product_code_pattern.sql   # replaced by the .up.sql version
rm backend/Dockerfile                                    # unused; docker/Dockerfile.backend is the real one
```

**d. Translations — nothing to merge**

Drop in `frontend/src/i18n/index.ts` plus `locales/extra.en.json` and
`locales/extra.fa.json`. The new `index.ts` deep-merges the extra bundles into
`en.json` / `fa.json` at load time, so `en.json` and `fa.json` stay exactly as
they are. Add future strings to the `extra.*` files.

---

## 3. Files to copy

```
.dockerignore
.env.example
docker-compose.yml
docker/nginx.conf                                    (new)
docker/Dockerfile.backend
docker/Dockerfile.frontend

backend/.env.example
backend/cmd/api/main.go
backend/cmd/migrate/main.go
backend/internal/config/config.go
backend/internal/middleware/cors.go
backend/internal/modules/products/service.go
backend/internal/modules/technicians/password.go     (new)
backend/internal/modules/technicians/routes.go
backend/migrations/011_add_product_code_pattern.up.sql
backend/migrations/014_add_guarantee_periods.up.sql

frontend/.env.example
frontend/src/api/auth.ts
frontend/src/api/axios.ts
frontend/src/types/auth.ts
frontend/src/routes/index.tsx
frontend/src/components/layout/Header.tsx
frontend/src/pages/SettingsPage.tsx                  (new)
frontend/src/features/auth/contexts/AuthContext.tsx
frontend/src/features/technicianPortal/api/technicianAuth.ts
frontend/src/features/technicianPortal/pages/TechnicianProfilePage.tsx   (new)
```

`technicians/password.go` adds methods to the existing `TechnicianService` and
`TechnicianHandler`, so `service.go` and `handler.go` stay untouched.

---

## 4. Deploy runbook

**Prerequisites:** Docker Engine 24+ with the Compose plugin, and a DNS record
pointing at the host.

```bash
# 1. Configure
cp .env.example .env
openssl rand -base64 48          # paste into JWT_SECRET
$EDITOR .env                     # set DB_PASSWORD, DB_USER, CORS_ALLOWED_ORIGINS

# 2. Build and start
docker compose build
docker compose up -d

# 3. Verify
docker compose ps                # migrate should show "exited (0)"
docker compose logs -f backend
curl -f http://localhost/health
curl -f http://localhost/api/v1/guarantees/public/periods
```

**Create the first admin** (there is no self-signup, by design):

```bash
docker compose exec backend /app/api --help   # not a CLI; use the admin tool instead
```

The admin CLI is not in the runtime image. Either run it from a checkout with
`DB_HOST` pointing at the container:

```bash
cd backend
DB_HOST=localhost DB_PORT=5432 DB_USER=... DB_PASSWORD=... DB_NAME=guarantee_db \
  go run cmd/admin/main.go create \
    -username=admin -password='<strong-password>' \
    -fullname='System Administrator' -email='admin@yourdomain.com'
```

…or insert directly with a bcrypt hash you generate yourself. Do **not** run
`make seed` in production: it creates `admin / Admin123!` and two demo
technicians with the password `Tech123!`.

**Migrations on later releases** run automatically — the `migrate` service
applies anything pending before the API starts. Check what is outstanding with:

```bash
docker compose run --rm migrate /app/migrate -cmd=status
```

### TLS

The bundled nginx serves plain HTTP on port 80. Put Caddy, Traefik, or an
external load balancer in front to terminate TLS, set `HTTP_PORT=8081` so the
frontend container is not exposed publicly, and point the proxy at it. Once TLS
is in place, make sure `CORS_ALLOWED_ORIGINS` uses the `https://` origin.

### Backups

Only two things hold state:

```bash
# Database
docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > backup-$(date +%F).sql.gz

# Uploaded invoices and guarantee cards
docker run --rm -v gms_uploads_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

---

## 5. Pre-launch checklist

- [ ] `DB_PASSWORD` rotated away from `Whoknowwho`
- [ ] `JWT_SECRET` generated fresh (≥32 chars) — this also invalidates the token committed in `.claude/settings.local.json`
- [ ] `.claude/settings.local.json` removed from version control
- [ ] `CORS_ALLOWED_ORIGINS` set to the real public origin, not `*`
- [ ] `APP_ENV=production`
- [ ] First admin created with a strong password; `make seed` **not** run
- [ ] Default seeded accounts (`admin`, `johndoe`, `janesmith`) absent — check with `go run cmd/admin/main.go list`
- [ ] TLS terminating in front of the frontend container
- [ ] Database and uploads backups scheduled and a restore tested once
- [ ] `/health` and `/ready` both returning 200
- [ ] Guarantee registration → admin approval → technician repair report walked end to end

---

## 6. Known gaps worth planning for

These are working as designed but are the next things I would address:

- **No rate limiting** on `/auth/login` or `/technician/login`. Add it at the
  reverse proxy (`limit_req` in nginx) before exposing the site publicly.
- **Guarantee expiry is derived, never stored.** The `Expired` status exists but
  nothing sets it; expiry is computed from `expiry_date` at read time. That is
  self-consistent — a background job that flipped the status would break the
  dashboard's expired count, which filters on `status IN ('Approved','Renewed')`.
  If you want a stored status, change the dashboard query in the same commit.
- **`repair_reports`, `parts` and `part_requests` tables** exist in migrations
  008–010 with no Go module behind them. Either build those features or drop the
  tables; leaving them adds confusion for whoever maintains this next.
- **No automated tests.** `make test` runs `go test ./...` against zero test
  files. The PowerShell suites are useful smoke tests but are manual and carry
  hardcoded credentials.
- **Admin user management has API endpoints but no UI.** `/admins` supports full
  CRUD; only the CLI reaches it today.

---

## 7. Follow-up: Farsi guarantee-period labels

The period dropdown stayed English because the labels come from the **server**:
`GuaranteeService.GetGuaranteePeriods()` returns hardcoded strings like
`"12 Months (1 Year)"`. No frontend translation could reach them. The same
payload carries a numeric `months`, so the label is now built client-side.

**Files:** `frontend/src/features/guarantees/hooks/useGuaranteePeriodLabel.ts` (new)
and `frontend/src/features/guarantees/components/GuaranteeStatusBadge.tsx`.

**Edit `frontend/src/features/guarantees/pages/PublicRegisterPage.tsx`:**

```diff
+import { useGuaranteePeriodLabel } from '../hooks/useGuaranteePeriodLabel'
```

Inside the component, next to the other hooks:

```diff
+  const periodLabel = useGuaranteePeriodLabel()
```

Then both places that render `period.label`:

```diff
-  items={periods.map((period) => ({ value: String(period.value), label: period.label }))}
+  items={periods.map((period) => ({ value: String(period.value), label: periodLabel(period.months) }))}
```

```diff
   <SelectItem key={period.value} value={String(period.value)}>
-    {period.label}
+    {periodLabel(period.months)}
   </SelectItem>
```

The keys live in `locales/extra.en.json` / `extra.fa.json` and are merged
automatically by the new `i18n/index.ts`.

### Also fixed here
`GuaranteeStatusBadge` printed the raw API value, so every guarantee read
"Approved" / "Pending" in Farsi too — while `status.Pending`, `status.Approved`
and the rest sat unused in both locale files. It now translates, with the raw
value as fallback.

### Still hardcoded English (not fixed)
Worth a pass before launch:
- `PublicRegisterPage` and `AdminGuaranteeForm`: `"✓ Product Matched:"`,
  `"Checking code..."`, `"No product matches this guarantee code"`, and the
  file-upload hints (`"Click to upload invoice"`, `"JPEG, PNG, PDF (max 10MB)"`).
- `PublicRegisterPage` success screen: `"Registration Successful!"` and the
  labels beneath it.
- `CustomerForm` and every toast message in the admin pages
  (`"Customer created successfully"` and friends) — the `*.createSuccess` keys
  exist in both locale files but the pages pass literals to `toast.success`.
- Backend validation messages returned to the UI are English only. Those need
  either a translation layer keyed on `errors.AppError`, or error codes the
  frontend maps to strings.


---

## 8. Translation architecture (why the dropdown stayed English)

Two separate causes, one after the other:

1. **The label came from the server.** `GetGuaranteePeriods()` returns
   `"12 Months (1 Year)"` as a literal. Fixed by building the label from the
   numeric `months` field in `useGuaranteePeriodLabel`.
2. **The Farsi keys were never merged into `fa.json`.** Every new string has a
   `defaultValue`, so the UI kept working — in English. The digits localised
   (`months ۳`) because that happens inside the hook, while the word came from
   the untranslated fallback. That mismatch is the tell: localised numbers next
   to an English word means the key is missing, not that the code is wrong.

`i18n/index.ts` now deep-merges `extra.en.json` / `extra.fa.json` over the base
locale files, so adding a string is a one-file edit and `en.json` / `fa.json`
are never touched.

**Adding a translated string from here on:**

```jsonc
// locales/extra.fa.json
{ "public": { "register": { "myNewKey": "متن فارسی" } } }
```

```tsx
t('public.register.myNewKey', { defaultValue: 'English text' })
```

Keep the `defaultValue` — it is what stops a missing key from rendering as a
raw dotted path in front of a customer.

### Files for this change
```
frontend/src/i18n/index.ts                                  (replaces existing)
frontend/src/i18n/locales/extra.en.json                     (new)
frontend/src/i18n/locales/extra.fa.json                     (new)
frontend/src/features/guarantees/pages/PublicRegisterPage.tsx
frontend/src/features/guarantees/pages/CheckGuaranteePage.tsx
frontend/src/features/guarantees/components/GuaranteeStatusBadge.tsx
frontend/src/features/guarantees/hooks/useGuaranteePeriodLabel.ts   (new)
```
