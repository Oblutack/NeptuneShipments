-- The Graph Network Table
CREATE TABLE ocean_network (
    id SERIAL PRIMARY KEY,
    source INTEGER,      -- ID of start node
    target INTEGER,      -- ID of end node
    cost FLOAT,          -- Length of line (for Dijkstra cost)
    reverse_cost FLOAT,  -- Length going backwards (same as cost)
    geom GEOMETRY(LINESTRING, 4326)
);

-- Index for spatial lookups
CREATE INDEX idx_ocean_network_geom ON ocean_network USING GIST(geom);