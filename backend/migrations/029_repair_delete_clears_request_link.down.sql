ALTER TABLE component_requests
    DROP CONSTRAINT IF EXISTS component_requests_repair_id_fkey;

ALTER TABLE component_requests
    ADD CONSTRAINT component_requests_repair_id_fkey
    FOREIGN KEY (repair_id) REFERENCES repairs(id);
