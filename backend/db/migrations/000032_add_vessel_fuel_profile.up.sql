-- Per-vessel fuel profile for the simulator: tons of fuel burned per day when
-- steaming at the design speed. Burn at any other speed scales with the cube
-- of the speed ratio (the real propeller law), so slowing down saves a lot.
-- The column defaults suit a generic mid-size ship; the backfill below sizes
-- the known types from their capacity.
ALTER TABLE vessels
    ADD COLUMN design_speed_knots DOUBLE PRECISION NOT NULL DEFAULT 18
        CHECK (design_speed_knots > 0),
    ADD COLUMN design_consumption_tpd DOUBLE PRECISION NOT NULL DEFAULT 100
        CHECK (design_consumption_tpd >= 0);

-- Container ships: 20 kn design speed, ~0.00645 t/day per TEU
-- (a 20,000 TEU ship burns ~130 t/day at 20 kn, ~95 t/day at 18 kn).
UPDATE vessels
SET design_speed_knots = 20,
    design_consumption_tpd = GREATEST(capacity_teu * 0.00645, 20)
WHERE type = 'CONTAINER' AND capacity_teu IS NOT NULL AND capacity_teu > 0;

-- Tankers: 15 kn design speed, ~0.0000174 t/day per barrel of capacity
-- (a 2M barrel ship burns ~35 t/day at 15 kn).
UPDATE vessels
SET design_speed_knots = 15,
    design_consumption_tpd = GREATEST(capacity_barrels * 0.0000174, 20)
WHERE type = 'TANKER' AND capacity_barrels IS NOT NULL AND capacity_barrels > 0;
