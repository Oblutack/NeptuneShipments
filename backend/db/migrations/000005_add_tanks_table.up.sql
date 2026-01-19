CREATE TABLE tanks (
    -- ... existing fields ...
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    capacity_barrels FLOAT NOT NULL,
    current_level FLOAT NOT NULL DEFAULT 0,
    cargo_type VARCHAR(100) DEFAULT 'Empty',
    temperature_c FLOAT DEFAULT 15.0,
    is_filling BOOLEAN DEFAULT FALSE,
    is_draining BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- ADD THIS CONSTRAINT:
    CONSTRAINT unique_tank_per_vessel UNIQUE (vessel_id, name)
);

CREATE INDEX idx_tanks_vessel ON tanks(vessel_id);