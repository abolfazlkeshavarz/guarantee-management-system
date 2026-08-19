-- ── Technical user becomes a staff role ──────────────────────────────────────
-- Previously a flag on technicians (review rights only). It is now a staff
-- account with the full admin surface minus delete, so it belongs next to
-- admins. Phone lives here too, because reviewer SMS now goes to staff rather
-- than to technicians.
ALTER TABLE admins
    ADD COLUMN IF NOT EXISTS role  VARCHAR(20) NOT NULL DEFAULT 'admin',
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NOT NULL DEFAULT '';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_admins_role') THEN
        ALTER TABLE admins ADD CONSTRAINT chk_admins_role
            CHECK (role IN ('admin', 'technical'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- ── Out-of-warranty work ─────────────────────────────────────────────────────
-- Repairs and part requests are now allowed against an expired guarantee, but
-- must be billed differently. Stamped at creation rather than derived, so a
-- later renewal cannot retroactively rewrite what was true at the time.
ALTER TABLE repairs
    ADD COLUMN IF NOT EXISTS guarantee_was_expired BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE component_requests
    ADD COLUMN IF NOT EXISTS guarantee_was_expired BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Part requests belong to a repair ─────────────────────────────────────────
ALTER TABLE component_requests
    ADD COLUMN IF NOT EXISTS repair_id BIGINT REFERENCES repairs(id);

CREATE INDEX IF NOT EXISTS idx_component_requests_repair_id
    ON component_requests(repair_id);

-- ── Many items per part request ──────────────────────────────────────────────
-- The single item_type/repair_component_id/repair_service_id/custom_item_name
-- columns on component_requests only ever held one line. They stay in place
-- (still written for backwards compatibility) but the item list is now here.
CREATE TABLE IF NOT EXISTS component_request_items (
    id                  BIGSERIAL PRIMARY KEY,
    component_request_id BIGINT NOT NULL REFERENCES component_requests(id) ON DELETE CASCADE,
    item_type           VARCHAR(20) NOT NULL,
    repair_component_id BIGINT REFERENCES repair_components(id),
    repair_service_id   BIGINT REFERENCES repair_services(id),
    custom_item_name    VARCHAR(150) NOT NULL DEFAULT '',
    quantity            INT NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_component_request_items_item CHECK (
        (item_type = 'component' AND repair_component_id IS NOT NULL)
     OR (item_type = 'service'   AND repair_service_id   IS NOT NULL)
     OR (item_type = 'custom'    AND custom_item_name <> '')
    ),
    CONSTRAINT chk_component_request_items_quantity
        CHECK (quantity >= 1 AND quantity <= 999)
);

CREATE INDEX IF NOT EXISTS idx_component_request_items_request
    ON component_request_items(component_request_id);

-- Carry every existing single-item request across as its first line item, so
-- nothing filed before this change reads as an empty request.
INSERT INTO component_request_items
    (component_request_id, item_type, repair_component_id, repair_service_id, custom_item_name, quantity, created_at)
SELECT r.id, r.item_type, r.repair_component_id, r.repair_service_id,
       COALESCE(r.custom_item_name, ''), COALESCE(r.quantity, 1), r.created_at
FROM component_requests r
WHERE r.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM component_request_items i WHERE i.component_request_id = r.id
  );
