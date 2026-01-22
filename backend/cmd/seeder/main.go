package main

import (
	"log"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/services"
	"github.com/joho/godotenv"
)

func main() {
    // 1. Setup
	if err := godotenv.Load("../../.env"); err != nil { 
        // Adjust path if running from root or backend folder
        godotenv.Load() 
    }
	dbService, err := database.New()
	if err != nil {
		log.Fatal(err)
	}
	defer dbService.Close()

    // 2. Init Services
	portRepo := repository.NewPortRepository(dbService)
	importer := services.NewImporterService(portRepo)

    // 3. Run Import
    // We assume the command is run from 'backend/' folder
	err = importer.ImportPorts("../data/ports.csv")
	if err != nil {
		log.Fatal("Import failed:", err)
	}
}