ALTER TABLE vessels DROP COLUMN route_progress;
ALTER TABLE vessels DROP COLUMN current_route_id;
DROP TABLE IF EXISTS routes;