TRUNCATE ocean_network RESTART IDENTITY;

-- 1. NORTH ATLANTIC (Curve to avoid UK/France)
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(-74.0 40.5, -60.0 40.0, -40.0 42.0, -20.0 45.0, -5.0 48.5, 3.5 52.0)', 4326));

-- 2. SOUTH ATLANTIC TO CAPE (Going around Africa)
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(-5.5 36.0, -10.0 30.0, -15.0 10.0, -10.0 -10.0, 0.0 -25.0, 18.0 -35.0)', 4326));

-- 3. MEDITERRANEAN (Detailed - Avoiding Tunisia/Italy)
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(-5.5 35.9, -2.0 36.5, 5.0 37.5, 10.0 38.0, 14.5 36.0, 20.0 35.0, 32.3 31.3)', 4326));

-- 4. INDIAN OCEAN (Suez -> Sri Lanka -> Malacca)
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(32.5 29.9, 35.0 25.0, 43.5 12.6)', 4326)), -- Red Sea
(ST_GeomFromText('LINESTRING(43.5 12.6, 55.0 12.0, 75.0 8.0, 80.0 6.0)', 4326)), -- Arabian Sea
(ST_GeomFromText('LINESTRING(80.0 6.0, 90.0 6.0, 95.0 5.5)', 4326)); -- Bay of Bengal

-- 5. PACIFIC RIM (Singapore -> Shanghai -> Tokyo -> LA)
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(95.0 5.5, 103.8 1.3)', 4326)), -- Malacca
(ST_GeomFromText('LINESTRING(103.8 1.3, 105.0 5.0, 110.0 15.0, 114.0 22.0)', 4326)), -- South China Sea
(ST_GeomFromText('LINESTRING(114.0 22.0, 122.0 31.2)', 4326)), -- Taiwan Strait
(ST_GeomFromText('LINESTRING(122.0 31.2, 130.0 33.0, 140.0 35.0)', 4326)), -- Japan
(ST_GeomFromText('LINESTRING(140.0 35.0, 160.0 40.0, -160.0 45.0, -140.0 42.0, -125.0 38.0, -118.0 33.7)', 4326)); -- Trans-Pacific Curve

-- 6. PANAMA (LA -> Panama -> NYC)
INSERT INTO ocean_network (geom) VALUES 
(ST_GeomFromText('LINESTRING(-118.0 33.7, -110.0 20.0, -90.0 10.0, -79.5 8.9)', 4326)), -- Pacific Coast
(ST_GeomFromText('LINESTRING(-79.5 9.0, -75.0 20.0, -74.0 35.0, -74.0 40.5)', 4326)); -- Atlantic Coast

-- BUILD
SELECT pgr_createTopology('ocean_network', 0.5, 'geom', 'id');
UPDATE ocean_network SET cost = ST_Length(geom), reverse_cost = ST_Length(geom);