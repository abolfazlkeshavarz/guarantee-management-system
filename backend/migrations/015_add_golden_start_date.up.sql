ALTER TABLE guarantees ADD COLUMN IF NOT EXISTS golden_start_date DATE;

-- Backfill: existing golden rows get purchase_date as their golden start
UPDATE guarantees g
SET golden_start_date = g.purchase_date
WHERE g.golden_expiry_date IS NOT NULL
  AND g.golden_start_date IS NULL;