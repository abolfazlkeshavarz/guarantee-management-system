-- Ensure the products table has the columns this migration (and 011) rely on.
-- (Safe no-op if 011_add_product_code_pattern.sql already applied them.)
ALTER TABLE products ADD COLUMN IF NOT EXISTS code_prefix VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS code_pattern VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS code_format VARCHAR(20) NOT NULL DEFAULT 'simple';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_code_prefix') THEN
        CREATE INDEX idx_products_code_prefix ON products(code_prefix);
    END IF;
END $$;

-- Category: Vacuum Cleaner
INSERT INTO product_categories (name, description, is_active)
SELECT 'Vacuum Cleaner', 'Home and handheld vacuum cleaners', true
WHERE NOT EXISTS (
    SELECT 1 FROM product_categories WHERE name = 'Vacuum Cleaner' AND deleted_at IS NULL
);

-- Product: Evinki Home Vacuum cleaner, using the "jalali_encoded" guarantee-code
-- format {year:4}EVC{month:2}{serial:5}, e.g. 1405EVC0912345.
INSERT INTO products (name, description, category_id, code_prefix, code_pattern, code_format, is_active)
SELECT
    'Evinki Home Vacuum cleaner',
    'Evinki home vacuum cleaner',
    (SELECT id FROM product_categories WHERE name = 'Vacuum Cleaner' AND deleted_at IS NULL ORDER BY id LIMIT 1),
    'EVC',
    '^[0-9]{4}EVC(0[1-9]|1[0-2])[0-9]{5}$',
    'jalali_encoded',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM products WHERE code_prefix = 'EVC' AND deleted_at IS NULL
);
