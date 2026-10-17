-- Route length in nautical miles, so the simulator can turn "distance sailed
-- this tick" into route progress. Generated, so every way a route gets
-- created (importer, seeder, shipment booking) has it with no code to forget.
ALTER TABLE routes ADD COLUMN length_nm DOUBLE PRECISION
    GENERATED ALWAYS AS (ST_Length(path) / 1852.0) STORED;
