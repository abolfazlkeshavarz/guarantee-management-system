-- A technician may replace a faulty part with one they already had, without
-- filing a part request first. Such a line has no delivered request line to
-- point at, so it is marked explicitly: an empty link alone cannot tell
-- "own stock" from "filed before the link existed".
ALTER TABLE repair_component_items
    ADD COLUMN IF NOT EXISTS from_own_stock BOOLEAN NOT NULL DEFAULT FALSE;
