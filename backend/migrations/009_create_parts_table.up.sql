-- Create parts table
CREATE TABLE IF NOT EXISTS parts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 0,
    minimum_quantity INTEGER DEFAULT 0,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_parts_name') THEN
        CREATE INDEX idx_parts_name ON parts(name);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_parts_deleted_at') THEN
        CREATE INDEX idx_parts_deleted_at ON parts(deleted_at);
    END IF;
END $$;