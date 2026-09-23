-- ── SMS patterns move out of .env and into the database ─────────────────────
-- Melli Payamak's SendByBaseNumber2 fills a template ("body") that was
-- pre-approved in their panel; the code only supplies the values. Which body
-- id belongs to which message used to be five SMS_BODY_ID_* variables, so
-- registering a new pattern meant editing .env and redeploying.
--
-- Now every pattern is a row an admin can edit, and new ones can be added for
-- things the code does not name in advance (poll invitations, offers).
CREATE TABLE IF NOT EXISTS sms_templates (
    id          BIGSERIAL PRIMARY KEY,
    -- Stable identifier the code (or a poll) refers to. Built-in keys are
    -- fixed; custom ones are chosen by the admin.
    key         VARCHAR(60)  NOT NULL UNIQUE,
    title       VARCHAR(120) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    -- The bodyId registered in the Melli Payamak panel. 0 means "not set yet",
    -- which the app treats as "do not send".
    body_id     INT          NOT NULL DEFAULT 0,
    -- The text of the approved pattern, kept here purely so an admin can see
    -- what will actually be delivered. The provider holds the real copy.
    sample_text TEXT         NOT NULL DEFAULT '',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    -- Built-ins are wired to code paths, so their key cannot change and they
    -- cannot be deleted - only re-pointed at a different body id.
    is_builtin  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_sms_templates_body_id CHECK (body_id >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sms_templates_active ON sms_templates(is_active);

-- The patterns the code sends today. body_id stays 0 here; on first boot the
-- app copies whatever SMS_BODY_ID_* values are still in the environment into
-- the rows that have not been set, so an existing deployment keeps working
-- without anyone retyping them.
INSERT INTO sms_templates (key, title, description, is_builtin)
SELECT v.key, v.title, v.description, TRUE
  FROM (VALUES
    ('guarantee_approved', 'Guarantee approved',
     'Sent to the customer when their guarantee is approved. One value: the whole sentence.'),
    ('guarantee_renewed', 'Guarantee renewed',
     'Sent to the customer when their guarantee is extended. One value: the whole sentence.'),
    ('part_request', 'Part request filed',
     'Sent to staff when a technician requests a part or service. One value: the whole sentence.'),
    ('repair_report', 'Repair report filed',
     'Sent to staff when a technician files a repair report. One value: the whole sentence.'),
    ('test', 'Test message',
     'Used only by the "send test SMS" button in settings.')
  ) AS v(key, title, description)
 WHERE NOT EXISTS (SELECT 1 FROM sms_templates t WHERE t.key = v.key);
