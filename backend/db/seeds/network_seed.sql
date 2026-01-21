-- Clear old data
TRUNCATE ocean_network RESTART IDENTITY;

-- 1. MEDITERRANEAN HIGHWAY
-- Gibraltar -> Malta -> Suez
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(-5.5 35.9, 14.5 35.9)', 4326)), -- Gib to Malta
(ST_GeomFromText('LINESTRING(14.5 35.9, 32.3 31.3)', 4326)); -- Malta to Suez

-- 2. RED SEA / INDIAN OCEAN
-- Suez -> Aden -> Sri Lanka -> Malacca
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(32.5 29.9, 43.5 12.6)', 4326)), -- Suez to Aden
(ST_GeomFromText('LINESTRING(43.5 12.6, 80.0 6.0)', 4326)),  -- Aden to Sri Lanka
(ST_GeomFromText('LINESTRING(80.0 6.0, 95.0 5.5)', 4326));   -- Sri Lanka to Malacca Entrance

-- 3. ASIAN PACIFIC
-- Malacca -> Singapore -> South China Sea -> Shanghai -> Tokyo
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(95.0 5.5, 103.8 1.3)', 4326)),   -- Malacca to Singapore
(ST_GeomFromText('LINESTRING(103.8 1.3, 114.0 22.0)', 4326)), -- Singapore to Hong Kong
(ST_GeomFromText('LINESTRING(114.0 22.0, 122.0 31.2)', 4326)),-- HK to Shanghai
(ST_GeomFromText('LINESTRING(122.0 31.2, 140.0 35.0)', 4326));-- Shanghai to Tokyo

-- 4. TRANS-PACIFIC
-- Tokyo -> LA
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(140.0 35.0, -118.0 33.7)', 4326)); -- Tokyo to LA

-- 5. ATLANTIC
-- Gibraltar -> English Channel -> Rotterdam
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(-5.5 35.9, -10.0 42.0)', 4326)),  -- Gib to Portugal Coast
(ST_GeomFromText('LINESTRING(-10.0 42.0, -5.0 48.5)', 4326)),  -- Portugal to Ushant
(ST_GeomFromText('LINESTRING(-5.0 48.5, 3.5 52.0)', 4326));    -- Ushant to Rotterdam

-- 6. TRANS-ATLANTIC
-- English Channel -> New York
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(-5.0 48.5, -74.0 40.5)', 4326));  -- UK to NYC

-- 7. PANAMA ROUTE
-- LA -> Panama -> NYC
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(-118.0 33.7, -79.5 8.9)', 4326)), -- LA to Panama
(ST_GeomFromText('LINESTRING(-79.5 9.0, -74.0 40.5)', 4326));  -- Panama to NYC

-- CRITICAL STEP: Build the Topology
-- This allows pgRouting to understand how lines connect (Nodes & Edges)
SELECT pgr_createTopology('ocean_network', 0.1, 'geom', 'id');

-- Calculate Costs (Distance)
UPDATE ocean_network SET cost = ST_Length(geom), reverse_cost = ST_Length(geom);