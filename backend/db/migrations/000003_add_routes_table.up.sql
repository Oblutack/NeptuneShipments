CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL, 
    origin_port_id UUID REFERENCES ports(id),
    destination_port_id UUID REFERENCES ports(id),
    
    -- The LineString path (Invisible track on the ocean)
    path GEOGRAPHY(LINESTRING, 4326),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A ship is currently "On" a specific route
ALTER TABLE vessels ADD COLUMN current_route_id UUID REFERENCES routes(id);
-- How far along the route is the ship? (0.0 = Start, 1.0 = Finish)
ALTER TABLE vessels ADD COLUMN route_progress FLOAT DEFAULT 0.0