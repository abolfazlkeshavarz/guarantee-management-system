-- backend/migrations/XXXX_add_product_code_pattern.sql

-- Add code_pattern and code_prefix columns to products table
ALTER TABLE products ADD COLUMN code_pattern VARCHAR(255);
ALTER TABLE products ADD COLUMN code_prefix VARCHAR(20);
CREATE INDEX idx_products_code_prefix ON products(code_prefix);

-- Update existing products with sample patterns
UPDATE products SET code_prefix = 'FZ530', code_pattern = '^FZ530-\\d{6}$' WHERE name LIKE '%FZ530%';
UPDATE products SET code_prefix = 'X100', code_pattern = '^X100-\\d{6}$' WHERE name LIKE '%X100%';
UPDATE products SET code_prefix = 'P500', code_pattern = '^P500-\\d{8}$' WHERE name LIKE '%P500%';