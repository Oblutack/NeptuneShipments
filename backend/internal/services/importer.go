package services

import (
	"context"
	"encoding/csv"
	"fmt"
	"os"
	"strconv"

	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
)

type ImporterService struct {
	portRepo *repository.PortRepository
}

func NewImporterService(portRepo *repository.PortRepository) *ImporterService {
	return &ImporterService{portRepo: portRepo}
}

func (s *ImporterService) ImportPorts(filePath string) error {
	f, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	records, err := reader.ReadAll() // Reads all rows
	if err != nil {
		return err
	}

	ctx := context.Background()
	count := 0

	// Skip header row (i=1)
	for i := 1; i < len(records); i++ {
		row := records[i]
		// row[0]=name, row[1]=locode, row[2]=country, row[3]=lat, row[4]=lon
		
		lat, _ := strconv.ParseFloat(row[3], 64)
		lon, _ := strconv.ParseFloat(row[4], 64)

		// Call the repo (We need to add a generic Create method to PortRepo first)
		err := s.portRepo.CreateOrUpdate(ctx, row[0], row[1], row[2], lat, lon)
		if err != nil {
			fmt.Printf("Error importing %s: %v\n", row[0], err)
			continue
		}
		count++
	}
	fmt.Printf("✅ Imported %d Ports from CSV\n", count)
	return nil
}