-- 1. Create Components Table
CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL, -- e.g., "Main Engine Cylinder 1"
    type VARCHAR(50) NOT NULL,  -- 'PROPULSION', 'ELECTRICAL', 'NAVIGATION', 'HULL'
    
    -- Health Logic
    health_percentage FLOAT NOT NULL DEFAULT 100.0,
    status VARCHAR(20) NOT NULL DEFAULT 'OPERATIONAL', -- 'OPERATIONAL', 'WARNING', 'CRITICAL'
    
    -- Telemetry
    total_operating_hours FLOAT DEFAULT 0,
    last_maintenance TIMESTAMP DEFAULT NOW(),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure a ship doesn't have two "Main Engines" (optional, but good practice)
    CONSTRAINT unique_component_per_vessel UNIQUE (vessel_id, name)
);

-- 2. Add Index
CREATE INDEX idx_components_vessel ON components(vessel_id);