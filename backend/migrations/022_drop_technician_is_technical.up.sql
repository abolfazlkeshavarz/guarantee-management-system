-- ── Retire the technician-level "technical" flag ─────────────────────────────
-- The technical role moved to staff accounts (admins.role) in migration 020: a
-- technical user is a staff member with the full admin surface minus delete.
-- The flag left behind on technicians was never settable from any screen after
-- that move, so it stayed false for every row while the code, the JWT claim and
-- two routes still pretended it meant something.
DROP INDEX IF EXISTS idx_technicians_is_technical;
ALTER TABLE technicians DROP COLUMN IF EXISTS is_technical;
