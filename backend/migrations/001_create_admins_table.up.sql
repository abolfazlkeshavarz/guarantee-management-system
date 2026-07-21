-- Create admins table if not exists
CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admins_username') THEN
        CREATE INDEX idx_admins_username ON admins(username);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admins_email') THEN
        CREATE INDEX idx_admins_email ON admins(email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admins_deleted_at') THEN
        CREATE INDEX idx_admins_deleted_at ON admins(deleted_at);
    END IF;
END $$;

-- Insert default admin only if not exists
INSERT INTO admins (username, password, full_name, email, is_active) 
SELECT 'admin', '$2a$10$Bg7wFoLgx3kQoPJXKdIXUuW3nX5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L9M0N1O2P', 'System Administrator', 'admin@guarantee-system.com', true
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'admin');