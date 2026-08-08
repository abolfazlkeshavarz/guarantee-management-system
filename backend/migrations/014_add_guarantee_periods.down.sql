-- migrations/014_add_guarantee_periods.down.sql
ALTER TABLE guarantees DROP COLUMN IF EXISTS golden_expiry_date;
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_products_golden_le_default;
ALTER TABLE products DROP COLUMN IF EXISTS golden_guarantee_months;
ALTER TABLE products DROP COLUMN IF EXISTS default_guarantee_months;