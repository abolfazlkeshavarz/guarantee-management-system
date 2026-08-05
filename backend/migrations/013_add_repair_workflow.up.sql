-- Repair catalogs (admin-maintained) and per-repair line items.

-- Admin review audit trail, mirroring guarantees.approved_by/approved_at.
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES admins(id);
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE TABLE IF NOT EXISTS repair_components (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repair_services (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repair_component_items (
    id BIGSERIAL PRIMARY KEY,
    repair_id BIGINT NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
    repair_component_id BIGINT NOT NULL REFERENCES repair_components(id),
    report TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repair_service_items (
    id BIGSERIAL PRIMARY KEY,
    repair_id BIGINT NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
    repair_service_id BIGINT NOT NULL REFERENCES repair_services(id),
    report TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repair_component_items_repair_id') THEN
        CREATE INDEX idx_repair_component_items_repair_id ON repair_component_items(repair_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repair_service_items_repair_id') THEN
        CREATE INDEX idx_repair_service_items_repair_id ON repair_service_items(repair_id);
    END IF;
END $$;

-- Seed a starter catalog so the dropdowns aren't empty on first use.
INSERT INTO repair_components (name)
SELECT name FROM (VALUES
    ('Power Board'), ('Display'), ('Battery'), ('Motor'), ('Cable/Wiring'), ('Fan'), ('Filter')
) AS defaults(name)
WHERE NOT EXISTS (SELECT 1 FROM repair_components WHERE repair_components.name = defaults.name);

INSERT INTO repair_services (name)
SELECT name FROM (VALUES
    ('Inspection'), ('Cleaning'), ('Calibration'), ('Software Update'), ('General Maintenance')
) AS defaults(name)
WHERE NOT EXISTS (SELECT 1 FROM repair_services WHERE repair_services.name = defaults.name);
