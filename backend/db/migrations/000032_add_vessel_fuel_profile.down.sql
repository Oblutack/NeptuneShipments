ALTER TABLE vessels
    DROP COLUMN IF EXISTS design_consumption_tpd,
    DROP COLUMN IF EXISTS design_speed_knots;
