-- Create guarantees table
CREATE TABLE IF NOT EXISTS guarantees (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    purchase_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    invoice_image VARCHAR(255),
    guarantee_card_image VARCHAR(255),
    notes TEXT,
    created_by BIGINT REFERENCES admins(id),
    approved_by BIGINT REFERENCES admins(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guarantees_code') THEN
        CREATE INDEX idx_guarantees_code ON guarantees(code);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guarantees_customer_id') THEN
        CREATE INDEX idx_guarantees_customer_id ON guarantees(customer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guarantees_product_id') THEN
        CREATE INDEX idx_guarantees_product_id ON guarantees(product_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guarantees_status') THEN
        CREATE INDEX idx_guarantees_status ON guarantees(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_guarantees_deleted_at') THEN
        CREATE INDEX idx_guarantees_deleted_at ON guarantees(deleted_at);
    END IF;
END $$;