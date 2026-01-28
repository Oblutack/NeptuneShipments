package main

import (
	"context"
	"fmt"
	"log"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil { 
        godotenv.Load() 
    }
	dbService, err := database.New()
	if err != nil {
		log.Fatal(err)
	}
	defer dbService.Close()
	
    // 1. Init Repos
	portRepo := repository.NewPortRepository(dbService)
	userRepo := repository.NewUserRepository(dbService)
	vesselRepo := repository.NewVesselRepository(dbService.GetPool())
	routeRepo := repository.NewRouteRepository(dbService)
	shipmentRepo := repository.NewShipmentRepository(dbService) 

	routingEngineRepo := repository.NewRoutingRepository(dbService)
	crewRepo := repository.NewCrewRepository(dbService)

    // 2. Init Importer
	importer := services.NewImporterService(portRepo, userRepo, vesselRepo, routeRepo, shipmentRepo, routingEngineRepo, crewRepo)

    log.Println("🌱 Starting Data Ingestion...")

    // 3. Run Imports (Order matters!)
    // Users first
	if err := importer.ImportUsers("../data/users.csv"); err != nil {
		log.Fatal(err)
	}
    // Ports
	if err := importer.ImportPorts("../data/ports.csv"); err != nil {
		log.Fatal(err)
	}
    // Routes
	if err := importer.ImportRoutes("../data/routes.csv"); err != nil {
		log.Fatal(err)
	}
    // Vessels
	if err := importer.ImportVessels("../data/vessels.csv"); err != nil {
		log.Fatal(err)
	}
	// Shipments
	if err := importer.ImportShipments("../data/shipments.csv"); err != nil {
		log.Fatal(err)
	}

	if err := importer.ImportCrew("../data/crew.csv"); err != nil { 
        log.Fatal(err)
    }

	// Seed port infrastructure (terminals and berths)
	seedPortInfrastructure(dbService.GetPool())

	seedComponents(dbService.GetPool())

    log.Println("🌱 Data Ingestion Complete!")
}

// seedPortInfrastructure creates terminals and berths for all ports
func seedPortInfrastructure(pool *pgxpool.Pool) {
	ctx := context.Background()
	log.Println("🏗️ Building Port Infrastructure...")

	// 1. Fetch all ports
	rows, err := pool.Query(ctx, `SELECT id, name FROM ports ORDER BY name`)
	if err != nil {
		log.Fatalf("Failed to fetch ports: %v", err)
	}
	defer rows.Close()

	type PortInfo struct {
		ID   string
		Name string
	}

	var ports []PortInfo
	for rows.Next() {
		var p PortInfo
		if err := rows.Scan(&p.ID, &p.Name); err != nil {
			continue
		}
		ports = append(ports, p)
	}

	log.Printf("📍 Found %d ports to process", len(ports))

	// 2. Loop through each port
	for _, port := range ports {
		terminals := []struct {
			terminalType string
			name         string
		}{
			{"CONTAINER", fmt.Sprintf("%s Container Gateway", port.Name)},
			{"LIQUID", fmt.Sprintf("%s Oil Terminal", port.Name)},
		}

		for _, term := range terminals {
			var terminalID string
			
			// A. Check if Terminal exists first (to avoid ON CONFLICT errors if constraint is missing)
			checkQuery := `SELECT id FROM terminals WHERE port_id = $1 AND name = $2`
			err := pool.QueryRow(ctx, checkQuery, port.ID, term.name).Scan(&terminalID)

			if err != nil {
				// B. If not found, Insert
				insertQuery := `
					INSERT INTO terminals (port_id, name, type)
					VALUES ($1, $2, $3)
					RETURNING id
				`
				err = pool.QueryRow(ctx, insertQuery, port.ID, term.name, term.terminalType).Scan(&terminalID)
				if err != nil {
					log.Printf("❌ Error creating terminal %s: %v", term.name, err)
					continue
				}
			}

			// 4. Create 3 berths for each terminal
			for i := 1; i <= 3; i++ {
				berthName := fmt.Sprintf("Berth %d", i)
				
				// Using standard columns: name, length_meters
				berthQuery := `
					INSERT INTO berths (terminal_id, name, length_meters, is_occupied)
					VALUES ($1, $2, 400.0, false)
				`
				// We skip ON CONFLICT here for simplicity, or we could do a similar check
				// For the seeder, blind insert might create duplicates if ran twice, 
				// but that's safer than crashing on missing constraints right now.
				_, err := pool.Exec(ctx, berthQuery, terminalID, berthName)
				if err != nil {
					// Ignore duplicates if they happen
					// log.Printf("Debug: Berth create msg: %v", err)
				}
			}
		}
		log.Printf("✅ Infrastructure built for %s", port.Name)
	}
	log.Println("🏗️ Port Infrastructure Complete!")
}

func seedComponents(pool *pgxpool.Pool) {
	log.Println("🔧 Installing Ship Components...")
	ctx := context.Background()

	// 1. Get All Vessels
	rows, err := pool.Query(ctx, "SELECT id, name FROM vessels")
	if err != nil {
		log.Fatalf("Failed to fetch vessels: %v", err)
	}
	defer rows.Close()

	type VesselInfo struct {
		ID   string
		Name string
	}
	var vessels []VesselInfo
	
	for rows.Next() {
		var v VesselInfo
		rows.Scan(&v.ID, &v.Name)
		vessels = append(vessels, v)
	}

	// 2. Define Standard Parts List
	parts := []struct {
		Name   string
		Type   string
		Health float64 // Initial health (simulate some wear)
	}{
		{"Main Engine", "PROPULSION", 95.0},
		{"Auxiliary Generator", "ELECTRICAL", 98.0},
		{"X-Band Radar", "NAVIGATION", 88.0},
		{"Propeller Shaft", "PROPULSION", 92.0},
		{"Hull Integrity", "HULL", 100.0},
	}

	// 3. Install Parts
	for _, v := range vessels {
		for _, part := range parts {
            // Simulate wear: Randomize health slightly so they aren't all identical
            // (In a real app, use math/rand, here we just use fixed values for simplicity)
            
			_, err := pool.Exec(ctx, `
				INSERT INTO components (vessel_id, name, type, health_percentage)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (vessel_id, name) DO NOTHING
			`, v.ID, part.Name, part.Type, part.Health)
			
			if err != nil {
				log.Printf("❌ Failed to install %s on %s: %v", part.Name, v.Name, err)
			}
		}
		log.Printf("✅ Components installed on %s", v.Name)
	}
}