DROP TRIGGER IF EXISTS berth_allocation_updated ON berth_allocations;
DROP FUNCTION IF EXISTS update_berth_allocation_timestamp();
DROP INDEX IF EXISTS idx_berth_allocations_status;
DROP INDEX IF EXISTS idx_berth_allocations_vessel;
DROP INDEX IF EXISTS idx_berth_allocations_berth_time;
DROP TABLE IF EXISTS berth_allocations;