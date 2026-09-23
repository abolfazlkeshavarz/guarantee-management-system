-- ── Customer polls ──────────────────────────────────────────────────────────
-- Pick an audience (by city, region, product or how old their guarantee is),
-- text each of them a personal link, and read what comes back. Respondents can
-- then be sent an offer for a service or a part.
--
-- Every recipient gets their own token, so the page can greet them by name and
-- an answer is tied to a real customer without asking them to identify
-- themselves again.
CREATE TABLE IF NOT EXISTS polls (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    status      VARCHAR(20)  NOT NULL DEFAULT 'Draft',

    -- Which approved pattern carries the invitation, and which carries a
    -- follow-up offer. Keys into sms_templates rather than ids, so a pattern
    -- can be re-pointed without touching the poll.
    sms_template_key       VARCHAR(60) NOT NULL DEFAULT '',
    offer_sms_template_key VARCHAR(60) NOT NULL DEFAULT '',

    -- Some providers reject a message containing a URL. 'url' sends the whole
    -- link as the pattern's value; 'token' sends only the code, for a pattern
    -- that already has the address baked into its approved text.
    link_mode   VARCHAR(10)  NOT NULL DEFAULT 'url',

    -- The audience rules, kept so the poll can explain who it went to.
    filter_city             VARCHAR(50) NOT NULL DEFAULT '',
    filter_province         VARCHAR(50) NOT NULL DEFAULT '',
    filter_product_id       BIGINT REFERENCES products(id),
    filter_purchased_before DATE,
    filter_expiry_before    DATE,

    created_by  BIGINT REFERENCES admins(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at   TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ,

    CONSTRAINT chk_polls_status    CHECK (status IN ('Draft', 'Sending', 'Sent', 'Closed')),
    CONSTRAINT chk_polls_link_mode CHECK (link_mode IN ('url', 'token'))
);

CREATE INDEX IF NOT EXISTS idx_polls_status     ON polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_deleted_at ON polls(deleted_at);

CREATE TABLE IF NOT EXISTS poll_questions (
    id        BIGSERIAL PRIMARY KEY,
    poll_id   BIGINT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    position  INT    NOT NULL DEFAULT 0,
    text      VARCHAR(300) NOT NULL,
    -- rating = 1..5, yes_no, choice (see options), text = free writing
    kind      VARCHAR(20)  NOT NULL DEFAULT 'rating',
    -- Newline-separated choices, used only when kind = 'choice'.
    options   TEXT         NOT NULL DEFAULT '',
    required  BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_poll_questions_kind CHECK (kind IN ('rating', 'yes_no', 'choice', 'text'))
);

CREATE INDEX IF NOT EXISTS idx_poll_questions_poll ON poll_questions(poll_id, position);

CREATE TABLE IF NOT EXISTS poll_recipients (
    id           BIGSERIAL PRIMARY KEY,
    poll_id      BIGINT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    customer_id  BIGINT REFERENCES customers(id),
    guarantee_id BIGINT REFERENCES guarantees(id),

    -- The personal code in the link. Unique across every poll, so one lookup
    -- finds the recipient without knowing which poll it belongs to.
    token        VARCHAR(32) NOT NULL UNIQUE,

    -- Who this was when the audience was built. Snapshotted so a later edit
    -- (or deletion) of the customer cannot rewrite what was sent.
    customer_name  VARCHAR(100) NOT NULL DEFAULT '',
    customer_phone VARCHAR(20)  NOT NULL DEFAULT '',
    customer_city  VARCHAR(50)  NOT NULL DEFAULT '',
    guarantee_code VARCHAR(50)  NOT NULL DEFAULT '',
    product_name   VARCHAR(150) NOT NULL DEFAULT '',

    sms_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    sms_error  TEXT        NOT NULL DEFAULT '',
    sent_at    TIMESTAMPTZ,

    opened_at    TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,

    -- Follow-up offer, sent to a subset after the answers are read.
    offer_sent_at TIMESTAMPTZ,
    offer_error   TEXT NOT NULL DEFAULT '',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_poll_recipients_sms CHECK (sms_status IN ('Pending', 'Sent', 'Failed', 'Skipped'))
);

CREATE INDEX IF NOT EXISTS idx_poll_recipients_poll   ON poll_recipients(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_recipients_status ON poll_recipients(poll_id, sms_status);
-- One invitation per customer per poll.
CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_recipients_customer
    ON poll_recipients(poll_id, customer_id) WHERE customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS poll_answers (
    id           BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES poll_recipients(id) ON DELETE CASCADE,
    question_id  BIGINT NOT NULL REFERENCES poll_questions(id) ON DELETE CASCADE,
    -- Text answers and the chosen option both land here; rating and yes/no
    -- also fill answer_number so results can be totalled without parsing.
    answer_text   TEXT NOT NULL DEFAULT '',
    answer_number INT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_poll_answers UNIQUE (recipient_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_answers_question ON poll_answers(question_id);

-- Two more patterns: the invitation and the follow-up offer. No body id yet -
-- an admin points them at patterns registered in the Melli Payamak panel.
INSERT INTO sms_templates (key, title, description, is_builtin)
SELECT v.key, v.title, v.description, TRUE
  FROM (VALUES
    ('poll_invite', 'Poll invitation',
     'Sent to a customer with their personal poll link. One value: the link (or just the code, if the address is already in the approved text).'),
    ('poll_offer', 'Poll follow-up offer',
     'Sent to someone who answered a poll, with an offer for a service or part. One value: the whole sentence.')
  ) AS v(key, title, description)
 WHERE NOT EXISTS (SELECT 1 FROM sms_templates t WHERE t.key = v.key);
