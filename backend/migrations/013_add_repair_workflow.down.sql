DROP TABLE IF EXISTS repair_service_items;
DROP TABLE IF EXISTS repair_component_items;
DROP TABLE IF EXISTS repair_services;
DROP TABLE IF EXISTS repair_components;
ALTER TABLE repairs DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE repairs DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE repairs DROP COLUMN IF EXISTS review_notes;
