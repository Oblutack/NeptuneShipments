
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create ENUM types
CREATE TYPE vessel_type AS ENUM ('TANKER', 'CONTAINER', 'BULK', 'LNG');
CREATE TYPE vessel_status AS ENUM ('AT_SEA', 'DOCKED', 'ANCHORED', 'MAINTENANCE');

-- 3. Create vessels table
CREATE TABLE vessels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    imo_number VARCHAR(20) UNIQUE NOT NULL,
    flag_country VARCHAR(2) NOT NULL,
    type vessel_type NOT NULL,
    status vessel_status NOT NULL DEFAULT 'DOCKED',
    capacity_teu INTEGER,
    capacity_barrels FLOAT,
    location GEOGRAPHY(POINT, 4326),
    heading FLOAT CHECK (heading >= 0 AND heading < 360),
    speed_knots FLOAT CHECK (speed_knots >= 0),
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vessels_location ON vessels USING GIST(location);

CREATE INDEX idx_vessels_imo ON vessels(imo_number);

CREATE INDEX idx_vessels_status ON vessels(status);
