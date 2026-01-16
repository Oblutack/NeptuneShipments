-- 1. Create Ports Table
-- UN/LOCODE is the 5-character standard (e.g., 'USNYC', 'CNSHA')
CREATE TABLE ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    un_locode VARCHAR(5) UNIQUE NOT NULL, 
    name VARCHAR(255) NOT NULL,
    country VARCHAR(2) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    timezone VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for finding "Ports near me"
CREATE INDEX idx_ports_location ON ports USING GIST(location);
CREATE INDEX idx_ports_locode ON ports(un_locode);

-- 2. Create Shipment Status Enum
CREATE TYPE shipment_status AS ENUM ('PENDING', 'IN_TRANSIT', 'CUSTOMS_HOLD', 'DELIVERED', 'CANCELLED');

-- 3. Create Shipments Table
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number VARCHAR(50) UNIQUE NOT NULL, -- The number the customer types (e.g., 'TRK-998877')
    
    -- Who owns it?
    customer_name VARCHAR(255) NOT NULL,
    
    -- Where is it going? (Foreign Keys to Ports)
    origin_port_id UUID NOT NULL REFERENCES ports(id),
    destination_port_id UUID NOT NULL REFERENCES ports(id),
    
    -- Who is carrying it? (Foreign Key to Vessels)
    -- Nullable because a shipment might be booked but not yet assigned to a ship
    vessel_id UUID REFERENCES vessels(id),
    
    -- Cargo Details
    description TEXT,
    container_number VARCHAR(11), -- Standard ISO 6346 (e.g., 'MSKU1234567')
    weight_kg FLOAT,
    status shipment_status NOT NULL DEFAULT 'PENDING',
    
    eta TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast tracking search
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_vessel ON shipments(vessel_id);