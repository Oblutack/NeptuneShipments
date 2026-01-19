CREATE TYPE user_role AS ENUM ('ADMIN', 'CLIENT', 'CAPTAIN');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, 
    full_name VARCHAR(100),
    company_name VARCHAR(100), 
    role user_role NOT NULL DEFAULT 'CLIENT',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE shipments ADD COLUMN client_id UUID REFERENCES users(id);