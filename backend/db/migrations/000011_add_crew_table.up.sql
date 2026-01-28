CREATE TYPE crew_role AS ENUM ('CAPTAIN', 'CHIEF_ENGINEER', 'FIRST_OFFICER', 'DECKHAND', 'COOK');

CREATE TABLE crew (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    role crew_role NOT NULL,
    license_number VARCHAR(50) UNIQUE,
    nationality VARCHAR(50),
    
    -- Assignment
    vessel_id UUID REFERENCES vessels(id) ON DELETE SET NULL, -- Can be null (On Shore Leave)
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ON_LEAVE', 'SICK'
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crew_vessel ON crew(vessel_id);