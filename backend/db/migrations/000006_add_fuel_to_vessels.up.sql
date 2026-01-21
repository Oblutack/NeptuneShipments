-- Add Fuel metrics to Vessels
-- Capacity in Metric Tonnes
ALTER TABLE vessels ADD COLUMN fuel_capacity FLOAT NOT NULL DEFAULT 5000.0;
ALTER TABLE vessels ADD COLUMN fuel_level FLOAT NOT NULL DEFAULT 5000.0;

-- Add a status for running out of fuel
ALTER TYPE vessel_status ADD VALUE IF NOT EXISTS 'DISTRESS';