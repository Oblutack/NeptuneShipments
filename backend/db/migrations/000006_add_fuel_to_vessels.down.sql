ALTER TABLE vessels DROP COLUMN fuel_level;
ALTER TABLE vessels DROP COLUMN fuel_capacity;
-- Removing ENUM values in Postgres is hard, usually we skip that in downs