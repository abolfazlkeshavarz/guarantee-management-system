-- "Technical user": a technician who, in addition to filing their own work,
-- may review (approve / reject / change status of) other technicians' part
-- requests and repair reports.
ALTER TABLE technicians
    ADD COLUMN IF NOT EXISTS is_technical BOOLEAN NOT NULL DEFAULT FALSE;

-- repairs.reviewed_by and component_requests.reviewed_by are FKs to admins(id),
-- so a technician reviewer cannot be stored there. Rather than dropping the
-- constraint (and the referential integrity with it), each table gets a
-- parallel nullable FK to technicians. Exactly one of the two is ever set.
ALTER TABLE repairs
    ADD COLUMN IF NOT EXISTS reviewed_by_technician_id BIGINT REFERENCES technicians(id);

ALTER TABLE component_requests
    ADD COLUMN IF NOT EXISTS reviewed_by_technician_id BIGINT REFERENCES technicians(id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_repairs_single_reviewer'
    ) THEN
        ALTER TABLE repairs ADD CONSTRAINT chk_repairs_single_reviewer
            CHECK (reviewed_by IS NULL OR reviewed_by_technician_id IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_component_requests_single_reviewer'
    ) THEN
        ALTER TABLE component_requests ADD CONSTRAINT chk_component_requests_single_reviewer
            CHECK (reviewed_by IS NULL OR reviewed_by_technician_id IS NULL);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_technicians_is_technical ON technicians(is_technical);
