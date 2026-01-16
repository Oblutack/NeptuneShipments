DROP INDEX IF EXISTS idx_vessels_imo;
DROP INDEX IF EXISTS idx_vessels_location;
DROP TABLE IF EXISTS vessels;
DROP TYPE IF EXISTS vessel_status;
DROP TYPE IF EXISTS vessel_type;
-- We generally don't drop the PostGIS extension as other apps might use it