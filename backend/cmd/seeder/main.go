package main

import (
	"context"
	"log"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
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

	// 1. SEED PORTS
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

	// 2. UPSERT ROUTE (Split logic for safety)
	// Step A: Insert or Update the Path
	_, err = pool.Exec(ctx, `
		INSERT INTO routes (name, path)
		VALUES (
			'Suez to Rotterdam',
			ST_GeogFromText('LINESTRING(
                32.56 29.93, 
                32.56 30.50, 
                32.35 31.26, 
                31.00 32.00, 
                14.00 35.50, 
                -5.50 36.00, 
                -10.0 40.00, 
                -5.00 48.00, 
                4.00 52.00
            )')
		)
		ON CONFLICT (name) 
		DO UPDATE SET path = EXCLUDED.path
	`)
	if err != nil {
		log.Fatal("Failed to upsert route:", err)
	}

	// Step B: Get the ID explicitly (Foolproof)
	var routeID string
	err = pool.QueryRow(ctx, "SELECT id FROM routes WHERE name = 'Suez to Rotterdam'").Scan(&routeID)
	if err != nil {
		log.Fatal("Failed to fetch route ID:", err)
	}
	log.Printf("✅ Route ID Found: %s", routeID)

	// 3. SEED VESSEL
	_, err = pool.Exec(ctx, `
		INSERT INTO vessels (name, imo_number, flag_country, type, status, capacity_teu, location, heading, speed_knots, current_route_id, route_progress)
		VALUES ('Ever Given', 'IMO9811000', 'PA', 'CONTAINER', 'AT_SEA', 20124, ST_SetSRID(ST_MakePoint(32.54, 29.9), 4326), 0, 5000.0, $1, 0.0)
		ON CONFLICT (imo_number) 
		DO UPDATE SET 
			current_route_id = $1, 
			route_progress = 0.0,
			speed_knots = 15.0,
			status = 'AT_SEA',
            location = ST_SetSRID(ST_MakePoint(32.54, 29.9), 4326)
	`, routeID)
	
	if err != nil {
		log.Fatal("Failed to seed vessel:", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO shipments (
			tracking_number, customer_name, origin_port_id, destination_port_id, 
			vessel_id, description, container_number, weight_kg, status
		)
		VALUES (
			'TRK-TEST-01', 
			'SpaceX', 
			(SELECT id FROM ports WHERE un_locode = 'USLAX'), -- Los Angeles
			(SELECT id FROM ports WHERE un_locode = 'NLRTM'), -- Rotterdam
			(SELECT id FROM vessels WHERE imo_number = 'IMO9811000'), -- Ever Given
			'Starlink Satellites', 
			'MSKU1234567', 
			5000.0, 
			'IN_TRANSIT'
		)
		ON CONFLICT (tracking_number) DO NOTHING
	`)
	if err != nil {
		log.Printf("Failed to seed shipment: %v", err)
	}
	log.Println("✅ Shipment 'TRK-TEST-01' Seeded")

	log.Println("✅ Vessel Assigned to Route")
	log.Println("🌱 Database Seeding Complete!")

	// 4. SEED USERS
	adminPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	var adminID string

	err = pool.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, full_name, company_name, role)
		VALUES ('admin@neptune.com', $1, 'Admin User', 'Neptune HQ', 'ADMIN')
		ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
		RETURNING id
	`, string(adminPassword)).Scan(&adminID)

	if err != nil {
		// If conflict update didn't return ID (because nothing changed), fetch it
		pool.QueryRow(ctx, "SELECT id FROM users WHERE email = 'admin@neptune.com'").Scan(&adminID)
	}
	log.Println("✅ Admin User Seeded")

	// Create a Client 
	clientPassword, _ := bcrypt.GenerateFromPassword([]byte("client123"), bcrypt.DefaultCost)
	var clientID string

	err = pool.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, full_name, company_name, role)
		VALUES ('elon@spacex.com', $1, 'Elon Musk', 'SpaceX', 'CLIENT')
		ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
		RETURNING id
	`, string(clientPassword)).Scan(&clientID)

	if err != nil {
		pool.QueryRow(ctx, "SELECT id FROM users WHERE email = 'elon@spacex.com'").Scan(&clientID)
	}
	log.Println("✅ Client User Seeded")

	// 5. SEED SHIPMENT
	_, err = pool.Exec(ctx, `
		INSERT INTO shipments (
			tracking_number, customer_name, origin_port_id, destination_port_id, 
			vessel_id, description, container_number, weight_kg, status, client_id
		)
		VALUES (
			'TRK-TEST-01', 
			'SpaceX', 
			(SELECT id FROM ports WHERE un_locode = 'USLAX'),
			(SELECT id FROM ports WHERE un_locode = 'NLRTM'),
			(SELECT id FROM vessels WHERE imo_number = 'IMO9811000'),
			'Starlink Satellites', 
			'MSKU1234567', 
			5000.0, 
			'IN_TRANSIT',
			$1 -- Pass the clientID here
		)
		ON CONFLICT (tracking_number) DO NOTHING
	`, clientID)
	
	// 6. SEED TANKER VESSEL ("Seawise Giant")
	// Using the same route for now, but different stats
	var tankerID string
	err = pool.QueryRow(ctx, `
		INSERT INTO vessels (name, imo_number, flag_country, type, status, capacity_barrels, location, heading, speed_knots, current_route_id, route_progress)
		VALUES ('Seawise Giant', 'IMO9999999', 'LR', 'TANKER', 'AT_SEA', 4000000, ST_SetSRID(ST_MakePoint(32.54, 29.9), 4326), 0, 3000.0, $1, 0.1)
		ON CONFLICT (imo_number) 
		DO UPDATE SET 
			speed_knots = 15.0, 
			status = 'AT_SEA',
            capacity_barrels = 4000000
		RETURNING id
	`, routeID).Scan(&tankerID)
	
	if err != nil {
		// If upsert didn't return ID (because no change), fetch it
		pool.QueryRow(ctx, "SELECT id FROM vessels WHERE imo_number = 'IMO9999999'").Scan(&tankerID)
	}
	log.Println("✅ Tanker 'Seawise Giant' Seeded")

	// 7. SEED TANKS FOR TANKER
	// Real tankers have multiple compartments. Let's add 3.
	tanks := []struct {
		Name     string
		Capacity float64
		Level    float64
		Type     string
	}{
		{"Tank 1 (Port)", 50000.0, 45000.0, "Crude Oil"},      // 90% Full
		{"Tank 1 (Stbd)", 50000.0, 10000.0, "Crude Oil"},      // 20% Full
		{"Tank 2 (Center)", 100000.0, 0.0, "Empty"},           // Empty
	}

	for _, t := range tanks {
		_, err = pool.Exec(ctx, `
			INSERT INTO tanks (vessel_id, name, capacity_barrels, current_level, cargo_type)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (vessel_id, name) DO NOTHING -- <--- Logic Fix
		`, tankerID, t.Name, t.Capacity, t.Level, t.Type)
        
        if err != nil {
            log.Printf("Error seeding tank %s: %v", t.Name, err)
        }
	}
	log.Println("✅ Tanks Installed on Seawise Giant")
}