# Part Requests module — install guide

Paths are relative to your project root
(`D:\Abolfazl Keshavarz\guarantee-management-system`). The `backend/` and
`frontend/` folders in this archive mirror yours, so most files copy straight
across.

## 1. New files (copy in)

**Backend**

```
backend/migrations/016_add_part_requests.up.sql
backend/migrations/016_add_part_requests.down.sql
backend/internal/modules/partrequests/model.go
backend/internal/modules/partrequests/dto.go
backend/internal/modules/partrequests/errors.go
backend/internal/modules/partrequests/repository.go
backend/internal/modules/partrequests/service.go
backend/internal/modules/partrequests/validator.go
backend/internal/modules/partrequests/handler.go
backend/internal/modules/partrequests/routes.go
```

**Frontend**

```
frontend/src/features/partRequests/types/index.ts
frontend/src/features/partRequests/api/partRequests.ts
frontend/src/features/partRequests/schemas/partRequestSchema.ts
frontend/src/features/partRequests/components/PartRequestStatusBadge.tsx
frontend/src/features/partRequests/components/PartRequestTable.tsx
frontend/src/features/partRequests/components/PartRequestViewDialog.tsx
frontend/src/features/partRequests/components/PartRequestStatusDialog.tsx
frontend/src/features/partRequests/components/PartRequestDeleteDialog.tsx
frontend/src/features/partRequests/pages/PartRequestsPage.tsx
frontend/src/features/technicianPortal/components/NewPartRequestDialog.tsx
frontend/src/features/technicianPortal/pages/TechnicianPartRequestsPage.tsx
```

## 2. Replaced files (overwrite — your current file plus the new lines)

```
backend/cmd/api/main.go                                                # registers the module
frontend/src/routes/index.tsx                                          # both new routes
frontend/src/components/layout/Sidebar.tsx                             # admin nav entry
frontend/src/features/technicianPortal/components/TechnicianLayout.tsx # technician nav entry
```

`routes/index.tsx` also drops the unused `useAuth()` / `isAuthenticated` line,
which `noUnusedLocals` in `tsconfig.app.json` flags on `npm run build`.

## 3. Translations — run the merge script, don't copy-paste

```powershell
node .\part-requests-module\i18n\merge-i18n.mjs .\frontend\src\i18n\locales
```

It deep-merges `i18n/partRequests.en.json` and `i18n/partRequests.fa.json` into
your `en.json` / `fa.json`, reading and writing UTF-8 so the Farsi survives
intact. Existing keys are never overwritten and re-running it is a no-op; it
prints exactly which keys it added.

Both sections carry 77 keys each — same key set, same `{{placeholders}}`,
verified. The module only borrows from `common.*` (`id`, `status`, `actions`,
`view`, `delete`, `cancel`, `previous`, `next`, `all`, `confirmDelete`,
`deleting`, `saving`, `refresh`, `reset`, `error`, `showingRange`), all of
which you already have in both languages. Everything else — including the
technician labels, guarantee-code labels and status filter — lives under
`partRequests.*`, so nothing in this module depends on another module's
translation tree.

Every RTL-sensitive element (dialog headers, nav rows, badges, stat cards,
table filters, the status-transition arrow) flips with `dir="rtl"` the same way
your repair-report screens do.

## 4. Migrate and run

```powershell
cd backend
make migrate-up     # creates component_requests
make run
```

The migration is idempotent (`CREATE TABLE IF NOT EXISTS`, indexes and CHECK
constraints guarded by `pg_indexes` / `pg_constraint` lookups), which matters
because your runner re-executes every `*.up.sql` on each call.

**Why the table is `component_requests`, not `part_requests`:** migration
`010_create_part_requests_table.up.sql` already created a `part_requests` table
with a foreign key to `parts(id)` for the unimplemented inventory module.
Reusing that name would collide on every migrate run. The Go package, the API
routes and the whole UI still say "part requests" — only the physical table
name differs.

## 5. Endpoints

Admin (`AuthMiddleware` + `AdminOnly`):

| Method | Path                                  | Purpose                          |
| ------ | ------------------------------------- | -------------------------------- |
| GET    | `/api/v1/part-requests`               | paginated list, filters + search |
| GET    | `/api/v1/part-requests/status-counts` | tab counters                     |
| GET    | `/api/v1/part-requests/:id`           | one request                      |
| POST   | `/api/v1/part-requests/:id/status`    | move to a new status             |
| DELETE | `/api/v1/part-requests/:id`           | soft delete                      |

Technician (`AuthMiddleware` + `TechnicianOnly`):

| Method | Path                                          | Purpose                        |
| ------ | --------------------------------------------- | ------------------------------ |
| GET    | `/api/v1/technician/part-requests`            | own requests                   |
| POST   | `/api/v1/technician/part-requests`            | file a request                 |
| GET    | `/api/v1/technician/part-requests/:id`        | own request, ownership-checked |
| POST   | `/api/v1/technician/part-requests/:id/cancel` | withdraw a pending one         |

Static-before-param registration order (`""`, `/status-counts`, `/:id`) matches
what the categories and repair-catalog modules already do, so Gin's router
tree accepts it.

## 6. Status model

```
Pending      → Approved, Cancelled
Approved     → NotDelivered, Delivered, Cancelled
NotDelivered → Delivered, Cancelled
Delivered    → (terminal)
Cancelled    → (terminal)
```

Enforced server-side in `model.go` (`allowedTransitions` / `canTransition`) and
mirrored in the UI by `PART_REQUEST_NEXT_STATUSES` in
`features/partRequests/types/index.ts` — change both together if you adjust the
flow. The dropdown only ever offers legal moves.

A technician can cancel only their own request, and only while it is still
`Pending`. Every other move is admin-only and records `reviewed_by`,
`reviewed_at` and optional `review_notes`; moving to `Delivered` also stamps
`delivered_at`.

## 7. Technician flow

The dialog asks the guarantee question first:

1. **"Is this request for a specific guarantee?"** → *Yes, I have a guarantee
   code* / *No guarantee code*.
2. If yes, the code is verified against `/guarantees/public/check` (the same
   endpoint the repair dialog uses) and the matched product and customer are
   shown. The rest of the form stays hidden until the code checks out.
3. **What do you need?** → *Pick from our list* (a component or a service from
   the Repair Components/Services catalog) or *Not in the list* (free text for
   anything not yet in the catalog).
4. Quantity and notes, then submit. It lands in the admin Part Requests tab as
   `Pending`.

Free-text items are flagged "Not in catalog" in the admin table, so it's easy
to spot the ones worth adding to the catalog permanently.
