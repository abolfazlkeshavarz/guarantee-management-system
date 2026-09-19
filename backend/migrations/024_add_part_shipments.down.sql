-- Rollback is not supported by the runner; kept for parity with the other
-- migrations and for manual use.
DROP TABLE IF EXISTS part_shipment_items;
DROP TABLE IF EXISTS part_shipments;
