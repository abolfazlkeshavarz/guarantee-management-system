-- Rollback is not supported by the runner; kept for parity.
ALTER TABLE technicians
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS province,
    DROP COLUMN IF EXISTS city,
    DROP COLUMN IF EXISTS about,
    DROP COLUMN IF EXISTS applied_at,
    DROP COLUMN IF EXISTS reviewed_at,
    DROP COLUMN IF EXISTS reviewed_by,
    DROP COLUMN IF EXISTS review_notes;
