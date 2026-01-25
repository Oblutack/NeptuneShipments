package services

import (
	"context"
	"encoding/csv"
	"fmt"
	"os"
	"strconv"

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
}

func NewImporterService(
	p *repository.PortRepository,
	u *repository.UserRepository,
	v *repository.VesselRepository,
	r *repository.RouteRepository,
	s *repository.ShipmentRepository,
	rt *repository.RoutingRepository,
) *ImporterService {
	return &ImporterService{
		portRepo:     p,
		userRepo:     u,
		vesselRepo:   v,
		routeRepo:    r,
		shipmentRepo: s,
		routingRepo:  rt, 
	}
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

func (s *ImporterService) ImportVessels(filePath string) error {
	records, err := readCSV(filePath)
	if err != nil { return err }

	ctx := context.Background()
	for i := 1; i < len(records); i++ {
		row := records[i]
		// row: name,imo,flag,type,teu,barrels,lat,lon,speed,fuel_cap,fuel_level
		
		teu, _ := strconv.Atoi(row[4])
		barrels, _ := strconv.ParseFloat(row[5], 64)
		lat, _ := strconv.ParseFloat(row[6], 64)
		lon, _ := strconv.ParseFloat(row[7], 64)
		speed, _ := strconv.ParseFloat(row[8], 64)
		fCap, _ := strconv.ParseFloat(row[9], 64)
		fLvl, _ := strconv.ParseFloat(row[10], 64)

		vessel := &models.Vessel{
			Name:            row[0],
			IMONumber:       row[1],
			FlagCountry:     row[2],
			Type:            row[3],
			CapacityTEU:     &teu,
			CapacityBarrels: &barrels,
			Latitude:        lat,
			Longitude:       lon,
			SpeedKnots:      speed,
			FuelCapacity:    fCap,
			FuelLevel:       fLvl,
		}
		if err := s.vesselRepo.CreateOrUpdate(ctx, vessel); err != nil {
			fmt.Printf("❌ Vessel Import Error (%s): %v\n", row[0], err)
		}
	}
	fmt.Println("✅ Vessels Imported")
	return nil
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