package services

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type ImporterService struct {
	portRepo     *repository.PortRepository
	userRepo     *repository.UserRepository
	vesselRepo   *repository.VesselRepository
	routeRepo    *repository.RouteRepository
	shipmentRepo *repository.ShipmentRepository
	routingRepo  *repository.RoutingRepository
	crewRepo     *repository.CrewRepository 
}

func NewImporterService(
	p *repository.PortRepository,
	u *repository.UserRepository,
	v *repository.VesselRepository,
	r *repository.RouteRepository,
	s *repository.ShipmentRepository,
	rt *repository.RoutingRepository,
	cr *repository.CrewRepository,
) *ImporterService {
	return &ImporterService{
		portRepo:     p,
		userRepo:     u,
		vesselRepo:   v,
		routeRepo:    r,
		shipmentRepo: s,
		routingRepo:  rt,
		crewRepo:     cr, 
	}
}

func (s *ImporterService) ImportPorts(ctx context.Context, reader io.Reader) (int, error) {
    csvReader := csv.NewReader(reader)
    csvReader.FieldsPerRecord = -1

    // Read header
    headers, err := csvReader.Read()
    if err != nil {
        return 0, fmt.Errorf("failed to read CSV header: %w", err)
    }

    // Map headers
    headerMap := make(map[string]int)
    for i, header := range headers {
        headerMap[strings.TrimSpace(strings.ToLower(header))] = i
    }

    // Validate required headers
    requiredHeaders := []string{"name", "locode", "country", "latitude", "longitude"}
    for _, required := range requiredHeaders {
        if _, ok := headerMap[required]; !ok {
            return 0, fmt.Errorf("missing required header: %s", required)
        }
    }

    // Read ports
    var ports []models.Port
    lineNum := 1

    for {
        record, err := csvReader.Read()
        if err == io.EOF {
            break
        }
        if err != nil {
            return 0, fmt.Errorf("error reading line %d: %w", lineNum, err)
        }
        lineNum++

        lat, err := strconv.ParseFloat(strings.TrimSpace(record[headerMap["latitude"]]), 64)
        if err != nil {
            return 0, fmt.Errorf("invalid latitude on line %d: %w", lineNum, err)
        }

        lon, err := strconv.ParseFloat(strings.TrimSpace(record[headerMap["longitude"]]), 64)
        if err != nil {
            return 0, fmt.Errorf("invalid longitude on line %d: %w", lineNum, err)
        }

        portType := "COMMERCIAL"
        if idx, ok := headerMap["type"]; ok && idx < len(record) && record[idx] != "" {
            portType = strings.TrimSpace(record[idx])
        }

        port := models.Port{
            Name:      strings.TrimSpace(record[headerMap["name"]]),
            UnLocode:    strings.TrimSpace(record[headerMap["locode"]]),
            Country:   strings.TrimSpace(record[headerMap["country"]]),
            Type:      portType,
            Latitude:  lat,
            Longitude: lon,
        }

        ports = append(ports, port)
    }

    if len(ports) == 0 {
        return 0, fmt.Errorf("no ports found in CSV")
    }

    // Bulk create
    if err := s.portRepo.BulkCreate(ctx, ports); err != nil {
        return 0, fmt.Errorf("failed to bulk create ports: %w", err)
    }

    return len(ports), nil
}

func (s *ImporterService) ImportUsers(filePath string) error {
	records, err := readCSV(filePath) // Helper function defined below
	if err != nil { return err }

	ctx := context.Background()
	for i := 1; i < len(records); i++ {
		row := records[i]
		// row: email, password, full_name, company, role
		
		hashedPwd, _ := bcrypt.GenerateFromPassword([]byte(row[1]), bcrypt.DefaultCost)
		
		user := &models.User{
			Email:        row[0],
			PasswordHash: string(hashedPwd),
			FullName:     row[2],
			CompanyName:  row[3],
			Role:         row[4],
		}
		if err := s.userRepo.CreateOrUpdate(ctx, user); err != nil {
			fmt.Printf("❌ User Import Error (%s): %v\n", row[0], err)
		}
	}
	fmt.Println("✅ Users Imported")
	return nil
}

func (s *ImporterService) ImportVessels(ctx context.Context, reader io.Reader) (int, error) {
    csvReader := csv.NewReader(reader)
    csvReader.FieldsPerRecord = -1

    // Read header
    headers, err := csvReader.Read()
    if err != nil {
        return 0, fmt.Errorf("failed to read CSV header: %w", err)
    }

    // Map headers
    headerMap := make(map[string]int)
    for i, header := range headers {
        headerMap[strings.TrimSpace(strings.ToLower(header))] = i
    }

    // Validate required headers
    requiredHeaders := []string{"name", "imo_number", "type", "status", "latitude", "longitude"}
    for _, required := range requiredHeaders {
        if _, ok := headerMap[required]; !ok {
            return 0, fmt.Errorf("missing required header: %s", required)
        }
    }

    // Read vessels
    var vessels []models.Vessel
    lineNum := 1

    for {
        record, err := csvReader.Read()
        if err == io.EOF {
            break
        }
        if err != nil {
            return 0, fmt.Errorf("error reading line %d: %w", lineNum, err)
        }
        lineNum++

        lat, err := strconv.ParseFloat(strings.TrimSpace(record[headerMap["latitude"]]), 64)
        if err != nil {
            return 0, fmt.Errorf("invalid latitude on line %d: %w", lineNum, err)
        }

        lon, err := strconv.ParseFloat(strings.TrimSpace(record[headerMap["longitude"]]), 64)
        if err != nil {
            return 0, fmt.Errorf("invalid longitude on line %d: %w", lineNum, err)
        }

        // Parse optional fields
        heading := 0.0
        if idx, ok := headerMap["heading"]; ok && idx < len(record) && record[idx] != "" {
            heading, _ = strconv.ParseFloat(strings.TrimSpace(record[idx]), 64)
        }

        speedKnots := 0.0
        if idx, ok := headerMap["speed_knots"]; ok && idx < len(record) && record[idx] != "" {
            speedKnots, _ = strconv.ParseFloat(strings.TrimSpace(record[idx]), 64)
        }

        fuelLevel := 100.0
        if idx, ok := headerMap["fuel_level"]; ok && idx < len(record) && record[idx] != "" {
            fuelLevel, _ = strconv.ParseFloat(strings.TrimSpace(record[idx]), 64)
        }

        fuelCapacity := 100.0
        if idx, ok := headerMap["fuel_capacity"]; ok && idx < len(record) && record[idx] != "" {
            fuelCapacity, _ = strconv.ParseFloat(strings.TrimSpace(record[idx]), 64)
        }

        vessel := models.Vessel{
            Name:         strings.TrimSpace(record[headerMap["name"]]),
            IMONumber:    strings.TrimSpace(record[headerMap["imo_number"]]),
            Type:         strings.TrimSpace(record[headerMap["type"]]),
            Status:       strings.TrimSpace(record[headerMap["status"]]),
            Latitude:     lat,
            Longitude:    lon,
            Heading:      heading,
            SpeedKnots:   speedKnots,
            FuelLevel:    fuelLevel,
            FuelCapacity: fuelCapacity,
        }

        vessels = append(vessels, vessel)
    }

    if len(vessels) == 0 {
        return 0, fmt.Errorf("no vessels found in CSV")
    }

    // Bulk create
    if err := s.vesselRepo.BulkCreate(ctx, vessels); err != nil {
        return 0, fmt.Errorf("failed to bulk create vessels: %w", err)
    }

    return len(vessels), nil
}

func (s *ImporterService) ImportRoutes(filePath string) error {
	records, err := readCSV(filePath)
	if err != nil { return err }

	ctx := context.Background()
	for i := 1; i < len(records); i++ {
		row := records[i]
		// row: name, path_wkt
		if err := s.routeRepo.CreateFromWKT(ctx, row[0], row[1]); err != nil {
			fmt.Printf("❌ Route Import Error (%s): %v\n", row[0], err)
		}
	}
	fmt.Println("✅ Routes Imported")
	return nil
}

// Helper to read CSV
func readCSV(path string) ([][]string, error) {
	f, err := os.Open(path)
	if err != nil { return nil, err }
	defer f.Close()
	return csv.NewReader(f).ReadAll()
}

// generateManifestItems creates realistic manifest items based on shipment description
func generateManifestItems(description string, weightKG float64) models.ManifestItems {
	items := models.ManifestItems{}
	desc := strings.ToLower(description)
	
	// Electronics
	if strings.Contains(desc, "electronics") || strings.Contains(desc, "laptop") || strings.Contains(desc, "phone") {
		items = append(items, models.ManifestItem{
			SKU:        "ELEC-001",
			Description: "Laptop Computers",
			Quantity:   50,
			UnitValue:  1200.00,
			TotalValue: 60000.00,
		})
		items = append(items, models.ManifestItem{
			SKU:        "ELEC-002",
			Description: "Smartphones",
			Quantity:   200,
			UnitValue:  800.00,
			TotalValue: 160000.00,
		})
	}
	
	// Textiles/Clothing
	if strings.Contains(desc, "textile") || strings.Contains(desc, "clothing") || strings.Contains(desc, "garment") {
		items = append(items, models.ManifestItem{
			SKU:        "TEXT-001",
			Description: "Cotton T-Shirts",
			Quantity:   5000,
			UnitValue:  12.50,
			TotalValue: 62500.00,
		})
		items = append(items, models.ManifestItem{
			SKU:        "TEXT-002",
			Description: "Denim Jeans",
			Quantity:   2000,
			UnitValue:  35.00,
			TotalValue: 70000.00,
		})
	}
	
	// Machinery
	if strings.Contains(desc, "machinery") || strings.Contains(desc, "equipment") || strings.Contains(desc, "parts") {
		items = append(items, models.ManifestItem{
			SKU:        "MACH-001",
			Description: "Industrial Pumps",
			Quantity:   20,
			UnitValue:  15000.00,
			TotalValue: 300000.00,
		})
		items = append(items, models.ManifestItem{
			SKU:        "MACH-002",
			Description: "Engine Components",
			Quantity:   100,
			UnitValue:  850.00,
			TotalValue: 85000.00,
		})
	}
	
	// Food
	if strings.Contains(desc, "food") || strings.Contains(desc, "grain") || strings.Contains(desc, "produce") {
		items = append(items, models.ManifestItem{
			SKU:        "FOOD-001",
			Description: "Wheat Grain (tons)",
			Quantity:   int(weightKG / 1000), // Convert to tons
			UnitValue:  250.00,
			TotalValue: float64(int(weightKG/1000)) * 250.00,
		})
	}
	
	// Chemicals
	if strings.Contains(desc, "chemical") || strings.Contains(desc, "pharmaceutical") {
		items = append(items, models.ManifestItem{
			SKU:        "CHEM-001",
			Description: "Industrial Chemicals (drums)",
			Quantity:   200,
			UnitValue:  450.00,
			TotalValue: 90000.00,
		})
		items = append(items, models.ManifestItem{
			SKU:        "CHEM-002",
			Description: "Medical Supplies",
			Quantity:   500,
			UnitValue:  120.00,
			TotalValue: 60000.00,
		})
	}
	
	// Default/Generic cargo
	if len(items) == 0 {
		items = append(items, models.ManifestItem{
			SKU:        "GEN-001",
			Description: "General Cargo Pallets",
			Quantity:   int(weightKG / 500), // Assuming 500kg per pallet
			UnitValue:  350.00,
			TotalValue: float64(int(weightKG/500)) * 350.00,
		})
	}
	
	return items
}

func (s *ImporterService) ImportShipments(filePath string) error {
	records, err := readCSV(filePath)
	if err != nil { return err }

	ctx := context.Background()
	count := 0

	for i := 1; i < len(records); i++ {
		row := records[i]
		// 1. Resolve IDs
		originID, err := s.portRepo.GetIDByLocode(ctx, row[2])
		if err != nil { fmt.Printf("⚠️ Skip Origin %s\n", row[2]); continue }
		destID, err := s.portRepo.GetIDByLocode(ctx, row[3])
		if err != nil { fmt.Printf("⚠️ Skip Dest %s\n", row[3]); continue }
		
		var vesselIDPtr *string
		if row[4] != "" {
			vID, err := s.vesselRepo.GetIDByIMO(ctx, row[4])
			if err == nil { vesselIDPtr = &vID }
		}

		weight, _ := strconv.ParseFloat(row[6], 64)

		shipment := &models.Shipment{
			TrackingNumber:    row[0],
			CustomerName:      row[1],
			OriginPortID:      originID,
			DestinationPortID: destID,
			VesselID:          vesselIDPtr,
			Description:       row[5],
			WeightKG:          weight,
			ContainerNumber:   row[7],
            Status:            "PENDING", // Default
			ManifestItems:     generateManifestItems(row[5], weight),
		}

		if err := s.shipmentRepo.CreateOrUpdate(ctx, shipment); err != nil {
			fmt.Printf("❌ Error %s: %v\n", row[0], err)
		} else {
            // --- NEW: AUTO-ROUTE LOGIC ---
            // If we have a vessel, calculate the path immediately!
            if vesselIDPtr != nil {
                // A. Get Coords
                origin, _ := s.portRepo.GetByID(ctx, originID)
                dest, _ := s.portRepo.GetByID(ctx, destID)
                
                // B. Calc Path
                pathJSON, err := s.routingRepo.CalculatePath(ctx, origin.Latitude, origin.Longitude, dest.Latitude, dest.Longitude)
                if err == nil {
                    // C. Create Route
                    routeName := fmt.Sprintf("%s -> %s (Imported)", row[2], row[3])
                    routeID, _ := s.routeRepo.Create(ctx, routeName, pathJSON)
                    
                    // D. Assign to Vessel
                    s.vesselRepo.AssignRoute(ctx, *vesselIDPtr, routeID)
                    
                    // E. Set Status to IN_TRANSIT
                    s.shipmentRepo.UpdateStatus(ctx, shipment.ID, "IN_TRANSIT")
                } else {
                    fmt.Printf("⚠️ Routing failed for %s: %v\n", row[0], err)
                }
            }
			count++
		}
	}
	fmt.Printf("✅ Imported %d Shipments (With Routing)\n", count)
	return nil
}

// ImportCrew method
func (s *ImporterService) ImportCrew(filePath string) error {
    records, err := readCSV(filePath)
    if err != nil {
        return err
    }

    ctx := context.Background()
    count := 0

    for i := 1; i < len(records); i++ {
        row := records[i]
        // CSV format: name, role, license_number, nationality, vessel_imo

        var vesselIDPtr *string
        if len(row) > 4 && row[4] != "" {
            // Lookup vessel ID by IMO number
            vID, err := s.vesselRepo.GetIDByIMO(ctx, row[4])
            if err == nil {
                vesselIDPtr = &vID
            } else {
                fmt.Printf("⚠️ Vessel IMO %s not found for crew %s\n", row[4], row[0])
            }
        }

        // Handle nullable license_number
        var licensePtr *string
        if len(row) > 2 && row[2] != "" {
            licensePtr = &row[2]
        }

        crew := &models.CrewMember{
            Name:          row[0],
            Role:          row[1],
            LicenseNumber: licensePtr, 
            Nationality:   row[3],
            VesselID:      vesselIDPtr,
            Status:        "ACTIVE",
        }

        if err := s.crewRepo.CreateOrUpdate(ctx, crew); err != nil {
            fmt.Printf("❌ Crew Import Error (%s): %v\n", row[0], err)
        } else {
            count++
        }
    }

    fmt.Printf("✅ Imported %d Crew Members\n", count)
    return nil
}