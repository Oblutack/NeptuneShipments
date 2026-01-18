package main

import (
	"context"
	"log"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Could not load .env file.")
	}

	dbService, err := database.New()
	if err != nil {
		log.Fatal(err)
	}
	defer dbService.Close()
	
	pool := dbService.GetPool()
	ctx := context.Background()

	log.Println("🌱 Seeding Database...")

	// 1. SEED PORTS (Same as before)
	ports := []struct {
		Name, Locode, Country string
		Lat, Lon float64
	}{
		{"Rotterdam", "NLRTM", "NL", 51.9225, 4.47917},
		{"Shanghai", "CNSHA", "CN", 31.2304, 121.4737},
		{"Singapore", "SGSIN", "SG", 1.29027, 103.851959},
		{"Los Angeles", "USLAX", "US", 33.7288, -118.2620},
		{"New York", "USNYC", "US", 40.6698, -74.0448},
	}

	for _, p := range ports {
		pool.Exec(ctx, `
			INSERT INTO ports (name, un_locode, country, location)
			VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326))
			ON CONFLICT (un_locode) DO NOTHING`, 
			p.Name, p.Locode, p.Country, p.Lat, p.Lon,
		)
	}
	log.Println("✅ Ports Seeded")

	// 2. CREATE ROUTE (Suez -> Rotterdam)
	// Points: Suez -> South of Crete -> Malta -> Gibraltar -> Portugal Coast -> English Channel -> Rotterdam
	routeQuery := `
		INSERT INTO routes (name, path)
		VALUES (
			'Suez to Rotterdam',
			ST_GeogFromText('LINESTRING(32.54 29.9, 25.0 34.0, 14.0 35.5, -5.5 36.0, -10.0 40.0, -5.0 49.0, 4.0 52.0)')
		)
		RETURNING id
	`
	var routeID string
	err = pool.QueryRow(ctx, routeQuery).Scan(&routeID)
	if err != nil {
		// If it fails, maybe it exists, let's just grab the existing one (simple logic for now)
		pool.QueryRow(ctx, "SELECT id FROM routes WHERE name = 'Suez to Rotterdam' LIMIT 1").Scan(&routeID)
	}
	log.Printf("✅ Route Created: %s", routeID)

	// 3. SEED VESSEL (Assigned to Route)
	// We use ON CONFLICT to update the existing ship to use the new route
	_, err = pool.Exec(ctx, `
		INSERT INTO vessels (name, imo_number, flag_country, type, status, capacity_teu, location, heading, speed_knots, current_route_id, route_progress)
		VALUES ('Ever Given', 'IMO9811000', 'PA', 'CONTAINER', 'AT_SEA', 20124, ST_SetSRID(ST_MakePoint(32.54, 29.9), 4326), 0, 2000.0, $1, 0.0)
		ON CONFLICT (imo_number) 
		DO UPDATE SET 
			current_route_id = $1, 
			route_progress = 0.05, -- Start 5% in
			speed_knots = 50000.0, -- Super fast for demo purposes
			status = 'AT_SEA'
	`, routeID)
	
	if err != nil {
		log.Fatal("Failed to seed vessel:", err)
	}
	log.Println("✅ Vessel Assigned to Route")
}