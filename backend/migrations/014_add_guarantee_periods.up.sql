-- Guarantee period columns.
--
-- The original ADD CONSTRAINT had no existence guard, so a second run aborted
-- with "constraint already exists". Now safe to re-apply.

ALTER TABLE products ADD COLUMN IF NOT EXISTS default_guarantee_months INT NOT NULL DEFAULT 12;
ALTER TABLE products ADD COLUMN IF NOT EXISTS golden_guarantee_months  INT NOT NULL DEFAULT 3;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'chk_products_golden_le_default'
           AND conrelid = 'products'::regclass
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT chk_products_golden_le_default
            CHECK (golden_guarantee_months >= 0
                   AND golden_guarantee_months <= default_guarantee_months);
    END IF;
END $$;

ALTER TABLE guarantees ADD COLUMN IF NOT EXISTS golden_expiry_date DATE;

CREATE INDEX IF NOT EXISTS idx_guarantees_golden_expiry ON guarantees(golden_expiry_date);

-- Backfill: derive golden expiry for existing rows from their product setting.
UPDATE guarantees g
   SET golden_expiry_date = g.purchase_date + (p.golden_guarantee_months || ' months')::interval
  FROM products p
 WHERE p.id = g.product_id
   AND g.golden_expiry_date IS NULL
   AND p.golden_guarantee_months > 0;
