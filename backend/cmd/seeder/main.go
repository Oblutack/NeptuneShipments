package main

import (
	"log"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/services"
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

    // 2. Init Importer
	importer := services.NewImporterService(portRepo, userRepo, vesselRepo, routeRepo, shipmentRepo)

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

    log.Println("🌱 Data Ingestion Complete!")
}