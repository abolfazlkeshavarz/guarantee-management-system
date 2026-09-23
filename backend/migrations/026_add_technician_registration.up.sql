-- ── Technicians can apply for an account ────────────────────────────────────
-- Until now a technician account only existed if an admin typed it in (or
-- imported a spreadsheet). A technician can now register themselves; the
-- account is inert until someone reviews the information and approves it.
--
-- Existing rows default to 'Approved': they were created by staff, so they
-- have already been vetted and must keep working.
ALTER TABLE technicians
    ADD COLUMN IF NOT EXISTS status       VARCHAR(20) NOT NULL DEFAULT 'Approved',
    ADD COLUMN IF NOT EXISTS province     VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS city         VARCHAR(50) NOT NULL DEFAULT '',
    -- Free text the applicant writes about themselves (experience, the brands
    -- they work on). Staff read it when deciding.
    ADD COLUMN IF NOT EXISTS about        TEXT        NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS applied_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reviewed_by  BIGINT REFERENCES admins(id),
    ADD COLUMN IF NOT EXISTS review_notes TEXT        NOT NULL DEFAULT '';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_technicians_status') THEN
        ALTER TABLE technicians ADD CONSTRAINT chk_technicians_status
            CHECK (status IN ('Pending', 'Approved', 'Rejected'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);

-- Two more notification patterns, following the rows migration 025 created.
-- They have no body id yet: an admin points them at a pattern registered in
-- the Melli Payamak panel, and until then nothing is sent for them.
INSERT INTO sms_templates (key, title, description, is_builtin)
SELECT v.key, v.title, v.description, TRUE
  FROM (VALUES
    ('technician_registered', 'Technician applied',
     'Sent to staff when a technician registers and is waiting for review. One value: the whole sentence.'),
    ('technician_approved', 'Technician approved',
     'Sent to the technician when their registration is approved. One value: the whole sentence.')
  ) AS v(key, title, description)
 WHERE NOT EXISTS (SELECT 1 FROM sms_templates t WHERE t.key = v.key);
