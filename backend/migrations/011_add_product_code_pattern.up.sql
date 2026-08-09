-- Adds guarantee-code resolution columns to products.
--
-- The original file was named 011_add_product_code_pattern.sql (no ".up"), so
-- the migration runner never picked it up, and its bare ALTER TABLE statements
-- would have failed on any re-run. Rewritten to be idempotent and correctly
-- named. Delete the old 011_add_product_code_pattern.sql after copying this in.

ALTER TABLE products ADD COLUMN IF NOT EXISTS code_pattern VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS code_prefix VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_products_code_prefix ON products(code_prefix);

-- Sample patterns for legacy demo products. Only fills rows that have no
-- prefix yet, so re-running never clobbers real data.
UPDATE products SET code_prefix = 'FZ530', code_pattern = '^FZ530-[0-9]{6}$'
 WHERE name ILIKE '%FZ530%' AND (code_prefix IS NULL OR code_prefix = '');

UPDATE products SET code_prefix = 'X100', code_pattern = '^X100-[0-9]{6}$'
 WHERE name ILIKE '%X100%' AND (code_prefix IS NULL OR code_prefix = '');

UPDATE products SET code_prefix = 'P500', code_pattern = '^P500-[0-9]{8}$'
 WHERE name ILIKE '%P500%' AND (code_prefix IS NULL OR code_prefix = '');
