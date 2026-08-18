-- Global display settings, controlled by an admin and inherited by everyone
-- else (technician portal, public guarantee pages). Language/calendar used to
-- live only in each browser's localStorage, so a non-admin had no way to get
-- anything but the built-in English default.
--
-- Single-row table: the CHECK keeps it that way, so reads never have to pick
-- between rows.
CREATE TABLE IF NOT EXISTS app_settings (
    id         SMALLINT PRIMARY KEY DEFAULT 1,
    language   VARCHAR(5)  NOT NULL DEFAULT 'en',
    calendar   VARCHAR(20) NOT NULL DEFAULT 'gregorian',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT app_settings_singleton CHECK (id = 1)
);

INSERT INTO app_settings (id, language, calendar)
VALUES (1, 'en', 'gregorian')
ON CONFLICT (id) DO NOTHING;
