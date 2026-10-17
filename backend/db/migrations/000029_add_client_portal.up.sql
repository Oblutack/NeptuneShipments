-- Links a shipment to the CLIENT user who booked it, so the client
-- portal can show "my shipments" instead of every shipment in the
-- system - the real architecture behind project44/FourKites-style
-- customer-facing tracking portals.
ALTER TABLE shipments ADD COLUMN customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Demo CLIENT account: client@neptune.com / client123 (bcrypt hash below
-- generated the same way the importer hashes any seeded user password).
INSERT INTO users (email, password_hash, full_name, company_name, role)
VALUES (
    'client@neptune.com',
    '$2a$10$SccoCsR4T/v0kYI62TcJi.NhYNG7MGkCF.VBbFqONhg7rW1E6BG/u',
    'Demo Client',
    'Acme Shipping Co',
    'CLIENT'
)
ON CONFLICT (email) DO NOTHING;

-- Associate a couple of existing demo shipments with that client so the
-- portal has something real to show immediately.
UPDATE shipments
SET customer_user_id = (SELECT id FROM users WHERE email = 'client@neptune.com')
WHERE id IN (
    SELECT id FROM shipments ORDER BY created_at DESC LIMIT 2
);
