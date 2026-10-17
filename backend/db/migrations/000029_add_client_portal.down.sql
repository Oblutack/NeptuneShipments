DELETE FROM users WHERE email = 'client@neptune.com';
ALTER TABLE shipments DROP COLUMN IF EXISTS customer_user_id;
