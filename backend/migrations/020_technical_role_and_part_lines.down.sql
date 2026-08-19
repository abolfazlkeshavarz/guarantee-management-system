DROP TABLE IF EXISTS component_request_items;

DROP INDEX IF EXISTS idx_component_requests_repair_id;
ALTER TABLE component_requests DROP COLUMN IF EXISTS repair_id;
ALTER TABLE component_requests DROP COLUMN IF EXISTS guarantee_was_expired;

ALTER TABLE repairs DROP COLUMN IF EXISTS guarantee_was_expired;

DROP INDEX IF EXISTS idx_admins_role;
ALTER TABLE admins DROP CONSTRAINT IF EXISTS chk_admins_role;
ALTER TABLE admins DROP COLUMN IF EXISTS phone;
ALTER TABLE admins DROP COLUMN IF EXISTS role;
