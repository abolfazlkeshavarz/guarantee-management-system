-- Who did what, and when. Populated by a Gin middleware that observes every
-- successful mutating request, so coverage does not depend on remembering to
-- instrument each new service method.
--
-- Deliberately stores no request bodies: the same middleware sees the login
-- endpoints, and a body column would mean writing plaintext passwords to a
-- table built for wide reading.
CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    actor_type  VARCHAR(20)  NOT NULL,       -- admin | technician | public
    actor_id    BIGINT,                      -- NULL for unauthenticated actions
    actor_name  VARCHAR(100) NOT NULL DEFAULT '',
    action      VARCHAR(30)  NOT NULL,       -- create | update | delete | approve | ...
    entity_type VARCHAR(50)  NOT NULL,       -- guarantees | customers | repairs | ...
    entity_id   BIGINT,                      -- NULL for collection-level actions
    method      VARCHAR(10)  NOT NULL,
    path        TEXT         NOT NULL,
    status_code INT          NOT NULL,
    ip          VARCHAR(64)  NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- The list screen is "newest first", optionally narrowed by actor or entity.
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
