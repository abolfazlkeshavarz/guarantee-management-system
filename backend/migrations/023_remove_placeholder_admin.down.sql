-- Irreversible by design: the placeholder row it removed was an unusable
-- account (non-bcrypt password), so there is nothing worth recreating.
-- Rollback is not supported by the runner anyway.
SELECT 1;
