-- component_requests.repair_id referenced repairs(id) with the default
-- RESTRICT action, so deleting a repair that any part request was linked to
-- (the "which repair is this for" field) failed with a foreign-key
-- violation, surfaced to the user as a 500. The link is informational only -
-- a request still makes sense on its own after the repair it was tied to is
-- gone - so it should be cleared, not block the delete.
ALTER TABLE component_requests
    DROP CONSTRAINT IF EXISTS component_requests_repair_id_fkey;

ALTER TABLE component_requests
    ADD CONSTRAINT component_requests_repair_id_fkey
    FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE SET NULL;
