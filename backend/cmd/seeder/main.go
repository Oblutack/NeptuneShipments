package main

import (
	"context"
	"log"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load env (Look in current folder first)
	// Since you run this from 'backend/', it will find .env immediately.
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Could not load .env file. Relying on system env vars.")
	}

	// 2. Connect to DB
	dbService, err := database.New()
	if err != nil {
		log.Fatal("Could not connect to database. Is Docker running? Error: ", err)
	}
	defer dbService.Close()
	
	pool := dbService.GetPool()
	ctx := context.Background()

	log.Println("🌱 Seeding Database...")

	// --- 3. SEED PORTS ---
	ports := []struct {
		Name    string
		Locode  string
		Country string
		Lat     float64
		Lon     float64
	}{
		{"Rotterdam", "NLRTM", "NL", 51.9225, 4.47917},
		{"Shanghai", "CNSHA", "CN", 31.2304, 121.4737},
		{"Singapore", "SGSIN", "SG", 1.29027, 103.851959},
		{"Los Angeles", "USLAX", "US", 33.7288, -118.2620},
		{"New York", "USNYC", "US", 40.6698, -74.0448},
	}

	for _, p := range ports {
		_, err := pool.Exec(ctx, `
			INSERT INTO ports (name, un_locode, country, location)
			VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326))
			ON CONFLICT (un_locode) DO NOTHING`, 
			p.Name, p.Locode, p.Country, p.Lat, p.Lon,
		)
		if err != nil {
			log.Printf("Failed to insert port %s: %v", p.Name, err)
		}
	}
	log.Println("✅ Ports Seeded")

	// --- 4. SEED VESSEL ---
	_, err = pool.Exec(ctx, `
		INSERT INTO vessels (name, imo_number, flag_country, type, status, capacity_teu, location, heading, speed_knots)
		VALUES ('Ever Given', 'IMO9811000', 'PA', 'CONTAINER', 'AT_SEA', 20124, ST_SetSRID(ST_MakePoint(32.5462, 30.0176), 4326), 45.0, 12.5)
		ON CONFLICT (imo_number) DO NOTHING
	`)
	if err != nil {
		log.Fatal("Failed to seed vessel:", err)
	}
	log.Println("✅ Vessel 'Ever Given' Seeded")

	log.Println("🌱 Database Seeding Complete!")
}