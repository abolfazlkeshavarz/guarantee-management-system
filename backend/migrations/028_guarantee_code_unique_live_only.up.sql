-- A guarantee code must be unique among guarantees that still exist. The
-- original column-level UNIQUE also counted soft-deleted rows, so deleting a
-- guarantee left its code permanently taken and re-registering the same code
-- failed with a unique violation (surfaced as a 500).
DO $$
DECLARE
    con text;
BEGIN
    FOR con IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'guarantees'::regclass
          AND c.contype = 'u'
          AND pg_get_constraintdef(c.oid) = 'UNIQUE (code)'
    LOOP
        EXECUTE format('ALTER TABLE guarantees DROP CONSTRAINT %I', con);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_guarantees_code_live
    ON guarantees(code) WHERE deleted_at IS NULL;
