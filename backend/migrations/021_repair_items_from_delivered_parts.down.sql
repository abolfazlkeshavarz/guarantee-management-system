DROP INDEX IF EXISTS idx_repair_service_items_request_item;
DROP INDEX IF EXISTS idx_repair_component_items_request_item;

ALTER TABLE repair_service_items
    DROP CONSTRAINT IF EXISTS repair_service_items_request_item_fkey;
ALTER TABLE repair_component_items
    DROP CONSTRAINT IF EXISTS repair_component_items_request_item_fkey;

ALTER TABLE repair_service_items DROP COLUMN IF EXISTS component_request_item_id;
ALTER TABLE repair_component_items DROP COLUMN IF EXISTS component_request_item_id;
