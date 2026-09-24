DROP INDEX IF EXISTS uq_guarantees_code_live;
-- The original constraint is not restored: it would fail as soon as a code
-- exists on both a live and a deleted guarantee.
