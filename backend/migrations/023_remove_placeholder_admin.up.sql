-- Migration 001 seeds a placeholder "admin" row whose password column holds a
-- 67-character string that is not a bcrypt hash, so no password can ever match
-- it. The row cannot be logged into, and it blocks creating a real account
-- named "admin" (the bootstrap script's `/app/admin create -username=admin`
-- fails with "already exists" and the operator is left with no way in).
--
-- Remove it, but only while it is still exactly the untouched placeholder:
-- the default identity, never logged in, and a password that is not a real
-- 60-character bcrypt hash. A genuine administrator who happens to be named
-- "admin" (real hash, or has signed in at least once) is left alone.
DELETE FROM admins
 WHERE username = 'admin'
   AND email = 'admin@guarantee-system.com'
   AND last_login IS NULL
   AND length(password) <> 60;
