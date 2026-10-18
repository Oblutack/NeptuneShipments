-- Persistent alert history. Alerts used to exist only in simulator memory and
-- on the WebSocket, so a page refresh or server restart lost them.
--
-- Two kinds of alert share the table:
--   * conditions (level CRITICAL: out of fuel, mechanical failure) stay open
--     until the vessel recovers (resolved_at is set then);
--   * events (level INFO: arrived, recovered) are recorded already resolved -
--     there is nothing to resolve, and that keeps them out of the unique index
--     below so a second arrival is recorded like the first.
-- Separately, an operator can acknowledge any alert.
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Kept (vessel_id nulled) if the vessel is later deleted; the name is a
    -- snapshot so the history still reads sensibly.
    vessel_id       UUID REFERENCES vessels(id) ON DELETE SET NULL,
    vessel_name     VARCHAR(255) NOT NULL,
    level           VARCHAR(10)  NOT NULL CHECK (level IN ('CRITICAL', 'INFO')),
    kind            VARCHAR(40)  NOT NULL,
    message         TEXT         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ
);

-- At most one open alert per vessel and condition: this is what stops the
-- simulator raising "out of fuel" again on every tick.
CREATE UNIQUE INDEX alerts_one_open_per_condition
    ON alerts (vessel_id, kind) WHERE resolved_at IS NULL;

CREATE INDEX alerts_created_at_idx ON alerts (created_at DESC);
CREATE INDEX alerts_unacknowledged_idx ON alerts (created_at DESC) WHERE acknowledged_at IS NULL;
