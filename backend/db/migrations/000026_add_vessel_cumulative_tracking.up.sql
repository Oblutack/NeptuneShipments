-- Lifetime cumulative fuel burned and distance traveled, incremented by
-- the simulator each tick. Needed to estimate a CII (Carbon Intensity
-- Indicator) rating per the IMO's real reference-line formula - a point-
-- in-time fuel_level reading alone can't tell you that.
ALTER TABLE vessels ADD COLUMN total_fuel_consumed_tons DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE vessels ADD COLUMN total_distance_nm DOUBLE PRECISION NOT NULL DEFAULT 0;
