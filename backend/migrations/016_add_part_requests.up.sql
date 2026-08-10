-- Part / component / service requests filed by technicians.
--
-- NOTE: the table is called component_requests, not part_requests, because
-- migration 010 already created a part_requests table for the (unimplemented)
-- parts-inventory module. Renaming or reusing that table would break 010's
-- FK to parts(id), so this module gets its own table.
--
-- The migrate runner re-executes every *.up.sql on each `make migrate-up`,
-- so everything below is idempotent.

CREATE TABLE IF NOT EXISTS component_requests (
    id BIGSERIAL PRIMARY KEY,
    technician_id BIGINT NOT NULL REFERENCES technicians(id),

    -- Optional: a request may or may not be tied to a guarantee.
    guarantee_id BIGINT REFERENCES guarantees(id),
    guarantee_code VARCHAR(50),

    -- 'component' | 'service' | 'custom'
    item_type VARCHAR(20) NOT NULL DEFAULT 'component',
    repair_component_id BIGINT REFERENCES repair_components(id),
    repair_service_id BIGINT REFERENCES repair_services(id),
    custom_item_name VARCHAR(150),

    quantity INT NOT NULL DEFAULT 1,
    notes TEXT,

    -- Pending | Approved | NotDelivered | Delivered | Cancelled
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',

    reviewed_by BIGINT REFERENCES admins(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    delivered_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_component_requests_technician_id') THEN
        CREATE INDEX idx_component_requests_technician_id ON component_requests(technician_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_component_requests_guarantee_id') THEN
        CREATE INDEX idx_component_requests_guarantee_id ON component_requests(guarantee_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_component_requests_status') THEN
        CREATE INDEX idx_component_requests_status ON component_requests(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_component_requests_deleted_at') THEN
        CREATE INDEX idx_component_requests_deleted_at ON component_requests(deleted_at);
    END IF;
END $$;

-- Exactly one of catalog-component / catalog-service / free-text must identify
-- the requested item. GORM writes '' (not NULL) for unused string columns, so
-- the custom branch checks for a non-empty value rather than NOT NULL.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_component_requests_item'
    ) THEN
        ALTER TABLE component_requests ADD CONSTRAINT chk_component_requests_item CHECK (
            (item_type = 'component' AND repair_component_id IS NOT NULL)
            OR (item_type = 'service' AND repair_service_id IS NOT NULL)
            OR (item_type = 'custom' AND custom_item_name IS NOT NULL AND custom_item_name <> '')
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_component_requests_quantity'
    ) THEN
        ALTER TABLE component_requests ADD CONSTRAINT chk_component_requests_quantity
            CHECK (quantity >= 1 AND quantity <= 999);
    END IF;
END $$;
