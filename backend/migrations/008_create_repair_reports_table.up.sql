-- Create repair_reports table
CREATE TABLE IF NOT EXISTS repair_reports (
    id BIGSERIAL PRIMARY KEY,
    repair_id BIGINT NOT NULL REFERENCES repairs(id),
    technician_id BIGINT NOT NULL REFERENCES technicians(id),
    report TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    images TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repair_reports_repair_id') THEN
        CREATE INDEX idx_repair_reports_repair_id ON repair_reports(repair_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repair_reports_technician_id') THEN
        CREATE INDEX idx_repair_reports_technician_id ON repair_reports(technician_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repair_reports_status') THEN
        CREATE INDEX idx_repair_reports_status ON repair_reports(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_repair_reports_deleted_at') THEN
        CREATE INDEX idx_repair_reports_deleted_at ON repair_reports(deleted_at);
    END IF;
END $$;