ALTER TABLE repairs DROP CONSTRAINT IF EXISTS chk_repairs_single_reviewer;
ALTER TABLE component_requests DROP CONSTRAINT IF EXISTS chk_component_requests_single_reviewer;
DROP INDEX IF EXISTS idx_technicians_is_technical;
ALTER TABLE repairs DROP COLUMN IF EXISTS reviewed_by_technician_id;
ALTER TABLE component_requests DROP COLUMN IF EXISTS reviewed_by_technician_id;
ALTER TABLE technicians DROP COLUMN IF EXISTS is_technical;
