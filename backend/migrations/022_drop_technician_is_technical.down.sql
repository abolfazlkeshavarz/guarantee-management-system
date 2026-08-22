ALTER TABLE technicians
    ADD COLUMN IF NOT EXISTS is_technical BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_technicians_is_technical ON technicians(is_technical);
