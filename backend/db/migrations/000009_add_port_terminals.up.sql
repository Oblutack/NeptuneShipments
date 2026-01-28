-- 1. Create Terminals (e.g., "APM Terminals", "Vopak Oil Terminal")
CREATE TABLE terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    port_id UUID NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'CONTAINER', 'BULK', 'LIQUID'
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Create Berths (The specific parking spots)
CREATE TABLE berths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id UUID NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- "Berth 1", "Berth 2"
    length_meters FLOAT, -- e.g., 400m
    is_occupied BOOLEAN DEFAULT FALSE,
    current_vessel_id UUID REFERENCES vessels(id), -- Who is parked here?
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Link Vessels to Berths
-- We add a column to vessels to know exactly where they are parked
ALTER TABLE vessels ADD COLUMN current_berth_id UUID REFERENCES berths(id);