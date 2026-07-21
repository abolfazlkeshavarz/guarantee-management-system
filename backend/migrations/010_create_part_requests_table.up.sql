-- Create part_requests table
CREATE TABLE IF NOT EXISTS part_requests (
    id BIGSERIAL PRIMARY KEY,
    part_id BIGINT NOT NULL REFERENCES parts(id),
    repair_id BIGINT REFERENCES repairs(id),
    quantity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'Requested',
    requested_by BIGINT REFERENCES technicians(id),
    approved_by BIGINT REFERENCES admins(id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_part_requests_part_id') THEN
        CREATE INDEX idx_part_requests_part_id ON part_requests(part_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_part_requests_repair_id') THEN
        CREATE INDEX idx_part_requests_repair_id ON part_requests(repair_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_part_requests_status') THEN
        CREATE INDEX idx_part_requests_status ON part_requests(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_part_requests_deleted_at') THEN
        CREATE INDEX idx_part_requests_deleted_at ON part_requests(deleted_at);
    END IF;
END $$;