-- ── A repair line records which delivered part it consumed ───────────────────
-- A technician receives parts by filing a part request and waiting for it to
-- be delivered. Until now the repair report picked freely from the catalog, so
-- nothing connected "this filter was replaced" to "this filter was issued to
-- this technician" -- the office could see both records but not that they were
-- the same physical part.
--
-- Nullable on purpose. Repairs filed before this column existed have no
-- delivery to point at, and an admin filing a repair on a technician's behalf
-- may be recording work whose paperwork came through another way.
ALTER TABLE repair_component_items
    ADD COLUMN IF NOT EXISTS component_request_item_id BIGINT;

ALTER TABLE repair_service_items
    ADD COLUMN IF NOT EXISTS component_request_item_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'repair_component_items_request_item_fkey'
    ) THEN
        ALTER TABLE repair_component_items
            ADD CONSTRAINT repair_component_items_request_item_fkey
            FOREIGN KEY (component_request_item_id)
            REFERENCES component_request_items(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'repair_service_items_request_item_fkey'
    ) THEN
        ALTER TABLE repair_service_items
            ADD CONSTRAINT repair_service_items_request_item_fkey
            FOREIGN KEY (component_request_item_id)
            REFERENCES component_request_items(id) ON DELETE SET NULL;
    END IF;
END $$;

-- The admin view answers "which repair used this delivered part?", so the
-- lookup runs from the request item inward.
CREATE INDEX IF NOT EXISTS idx_repair_component_items_request_item
    ON repair_component_items(component_request_item_id);

CREATE INDEX IF NOT EXISTS idx_repair_service_items_request_item
    ON repair_service_items(component_request_item_id);
