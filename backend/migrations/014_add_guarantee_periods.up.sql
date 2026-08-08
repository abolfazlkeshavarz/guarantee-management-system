-- migrations/014_add_guarantee_periods.up.sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_guarantee_months INT NOT NULL DEFAULT 12;
ALTER TABLE products ADD COLUMN IF NOT EXISTS golden_guarantee_months  INT NOT NULL DEFAULT 3;

ALTER TABLE products ADD CONSTRAINT chk_products_golden_le_default
    CHECK (golden_guarantee_months >= 0 AND golden_guarantee_months <= default_guarantee_months);

ALTER TABLE guarantees ADD COLUMN IF NOT EXISTS golden_expiry_date DATE;

CREATE INDEX IF NOT EXISTS idx_guarantees_golden_expiry ON guarantees(golden_expiry_date);

-- Backfill: derive golden expiry for existing rows from their product's setting.
UPDATE guarantees g
   SET golden_expiry_date = g.purchase_date + (p.golden_guarantee_months || ' months')::interval
  FROM products p
 WHERE p.id = g.product_id
   AND g.golden_expiry_date IS NULL;