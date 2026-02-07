-- Remove GIN index
DROP INDEX IF EXISTS idx_shipments_manifest_items;

-- Remove manifest_items column from shipments table
ALTER TABLE shipments
DROP COLUMN IF EXISTS manifest_items;
