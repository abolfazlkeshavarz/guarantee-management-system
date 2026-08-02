DELETE FROM products WHERE code_prefix = 'EVC';

DELETE FROM product_categories
WHERE name = 'Vacuum Cleaner'
  AND NOT EXISTS (SELECT 1 FROM products WHERE products.category_id = product_categories.id);

ALTER TABLE products DROP COLUMN IF EXISTS code_format;
