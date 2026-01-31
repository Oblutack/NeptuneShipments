-- Create berth allocations table
CREATE TABLE IF NOT EXISTS berth_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    berth_id UUID NOT NULL REFERENCES berths(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'SCHEDULED', -- SCHEDULED, ACTIVE, COMPLETED, CANCELLED
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent overlapping allocations for same berth
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Index for performance on time-range queries
CREATE INDEX idx_berth_allocations_berth_time 
ON berth_allocations(berth_id, start_time, end_time);

-- Index for vessel lookups
CREATE INDEX idx_berth_allocations_vessel 
ON berth_allocations(vessel_id);

-- Index for port-level queries (via berth -> terminal -> port)
CREATE INDEX idx_berth_allocations_status 
ON berth_allocations(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_berth_allocation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER berth_allocation_updated
    BEFORE UPDATE ON berth_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_berth_allocation_timestamp();