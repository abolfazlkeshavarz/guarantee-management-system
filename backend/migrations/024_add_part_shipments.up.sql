-- ── Sending replaced parts back ("ارسال قطعه") ───────────────────────────────
-- When a technician's repair report says a component was replaced, the OLD
-- component has to travel back to the company. The technician files a
-- shipment listing the parts they are sending; the company confirms what
-- actually arrived, prices it (the invoice) and finally pays the technician.
--
--   Sent  ->  Received  ->  Invoiced  ->  Paid
--     \-> Rejected (nothing usable arrived)   \-> Cancelled (technician withdrew)
--
-- A shipment line is one repair_component_items row: that table has no
-- quantity, each row is one physical part that came out of one appliance.
CREATE TABLE IF NOT EXISTS part_shipments (
    id              BIGSERIAL PRIMARY KEY,
    technician_id   BIGINT NOT NULL REFERENCES technicians(id),
    status          VARCHAR(20)  NOT NULL DEFAULT 'Sent',

    shipping_method VARCHAR(20)  NOT NULL DEFAULT 'post',
    tracking_code   VARCHAR(100) NOT NULL DEFAULT '',
    sent_on         DATE         NOT NULL,
    notes           TEXT         NOT NULL DEFAULT '',

    -- Receipt: the company confirms which lines actually arrived.
    received_at     TIMESTAMPTZ,
    received_by     BIGINT REFERENCES admins(id),
    receive_notes   TEXT NOT NULL DEFAULT '',

    -- Invoice: total is the sum of the received lines' unit prices, stored so
    -- a later edit of a line cannot silently change what was invoiced.
    invoiced_at     TIMESTAMPTZ,
    invoiced_by     BIGINT REFERENCES admins(id),
    invoice_total   BIGINT NOT NULL DEFAULT 0,

    -- Payment
    paid_at           TIMESTAMPTZ,
    paid_by           BIGINT REFERENCES admins(id),
    payment_reference VARCHAR(100) NOT NULL DEFAULT '',
    payment_notes     TEXT NOT NULL DEFAULT '',

    -- Why it was rejected or cancelled.
    review_notes    TEXT NOT NULL DEFAULT '',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_part_shipments_status
        CHECK (status IN ('Sent', 'Received', 'Invoiced', 'Paid', 'Rejected', 'Cancelled')),
    CONSTRAINT chk_part_shipments_method
        CHECK (shipping_method IN ('post', 'courier', 'in_person', 'other')),
    CONSTRAINT chk_part_shipments_total CHECK (invoice_total >= 0)
);

CREATE TABLE IF NOT EXISTS part_shipment_items (
    id                       BIGSERIAL PRIMARY KEY,
    shipment_id              BIGINT NOT NULL REFERENCES part_shipments(id) ON DELETE CASCADE,
    repair_component_item_id BIGINT NOT NULL REFERENCES repair_component_items(id),

    -- What the technician says about this part (burnt, cracked, ...).
    condition_note  VARCHAR(500) NOT NULL DEFAULT '',

    -- NULL until the receipt is recorded; then TRUE (arrived) / FALSE (did not).
    received        BOOLEAN,
    unit_price      BIGINT NOT NULL DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_part_shipment_items_price CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_part_shipments_technician ON part_shipments(technician_id);
CREATE INDEX IF NOT EXISTS idx_part_shipments_status     ON part_shipments(status);
CREATE INDEX IF NOT EXISTS idx_part_shipments_deleted_at ON part_shipments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_part_shipment_items_shipment ON part_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_part_shipment_items_repair_item
    ON part_shipment_items(repair_component_item_id);
