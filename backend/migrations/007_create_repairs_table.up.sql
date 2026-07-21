-- Create repairs table
CREATE TABLE IF NOT EXISTS repairs (
    id BIGSERIAL PRIMARY KEY,
    guarantee_id BIGINT NOT NULL REFERENCES guarantees(id),
    technician_id BIGINT REFERENCES technicians(id),
    status VARCHAR(20) DEFAULT 'Pending',
    description TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repairs_guarantee_id') THEN
        CREATE INDEX idx_repairs_guarantee_id ON repairs(guarantee_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repairs_technician_id') THEN
        CREATE INDEX idx_repairs_technician_id ON repairs(technician_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repairs_status') THEN
        CREATE INDEX idx_repairs_status ON repairs(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repairs_deleted_at') THEN
        CREATE INDEX idx_repairs_deleted_at ON repairs(deleted_at);
    END IF;
END $$;