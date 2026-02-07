-- Add manifest_items JSONB column to shipments table for detailed cargo tracking
ALTER TABLE shipments
ADD COLUMN manifest_items JSONB DEFAULT '[]'::jsonb NOT NULL;

-- Create GIN index for efficient JSONB queries
CREATE INDEX idx_shipments_manifest_items ON shipments USING GIN (manifest_items);

-- Add comment for documentation
COMMENT ON COLUMN shipments.manifest_items IS 'Array of manifest items with SKU, description, quantity, unit_value, and total_value';
