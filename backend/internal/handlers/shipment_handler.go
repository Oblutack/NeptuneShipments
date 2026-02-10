package handlers

import (
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/Oblutack/NeptuneShipments/backend/internal/services"
	"github.com/gofiber/fiber/v2"
)

type ShipmentHandler struct {
	repo        *repository.ShipmentRepository
	portRepo    *repository.PortRepository    
	routingRepo *repository.RoutingRepository 
	routeRepo   *repository.RouteRepository   
	vesselRepo  *repository.VesselRepository
	pdfService  *services.PDFService 
}

func NewShipmentHandler(
	repo *repository.ShipmentRepository,
	portRepo *repository.PortRepository,
	routingRepo *repository.RoutingRepository,
	routeRepo *repository.RouteRepository,
	vesselRepo *repository.VesselRepository,
	pdfService *services.PDFService,
) *ShipmentHandler {
	return &ShipmentHandler{
		repo:        repo,
		portRepo:    portRepo,
		routingRepo: routingRepo,
		routeRepo:   routeRepo,
		vesselRepo:  vesselRepo,
		pdfService: pdfService,
	}
}

func (h *ShipmentHandler) CreateShipment(c *fiber.Ctx) error {
	var shipment models.Shipment
	if err := c.BodyParser(&shipment); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	// 1. Check vessel status BEFORE creating shipment to set correct initial status
	initialStatus := "PENDING"
	if shipment.VesselID != nil && *shipment.VesselID != "" {
		vessel, err := h.vesselRepo.GetByID(c.Context(), *shipment.VesselID)
		if err == nil {
			// If vessel is already at sea, set shipment to IN_TRANSIT immediately
			if vessel.Status == "AT_SEA" {
				initialStatus = "IN_TRANSIT"
				fmt.Printf("✅ Vessel %s is already AT_SEA, setting shipment to IN_TRANSIT\n", vessel.Name)
			} else {
				fmt.Printf("⚓ Vessel %s is %s, shipment will be PENDING until vessel departs\n", vessel.Name, vessel.Status)
			}
		}
	}
	shipment.Status = initialStatus

	// 2. Create the Shipment Record with correct initial status
	if err := h.repo.Create(c.Context(), &shipment); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// 3. AUTOMATIC ROUTING LOGIC
	// If a vessel is assigned, we calculate the route for that vessel
	if shipment.VesselID != nil {
		// A. Get Port Coordinates
		origin, err := h.portRepo.GetByID(c.Context(), shipment.OriginPortID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Origin port not found"})
		}
		dest, err := h.portRepo.GetByID(c.Context(), shipment.DestinationPortID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Destination port not found"})
		}

		// B. Calculate Path using pgRouting
		pathJSON, err := h.routingRepo.CalculatePath(c.Context(), origin.Latitude, origin.Longitude, dest.Latitude, dest.Longitude)
		if err != nil {
			fmt.Printf("❌ Routing Error: %v\n", err)
			// Don't fail the request, just warn
		} else {
			// C. Save the new Route
			routeName := fmt.Sprintf("%s to %s (Auto)", origin.Name, dest.Name)
			routeID, err := h.routeRepo.Create(c.Context(), routeName, pathJSON)
			if err == nil {
				// D. Assign Route to Vessel (This sets vessel to AT_SEA and refuels it)
				err = h.vesselRepo.AssignRoute(c.Context(), *shipment.VesselID, routeID)
				if err != nil {
					fmt.Printf("❌ Failed to assign route to vessel: %v\n", err)
				} else {
					fmt.Printf("🚢 Route assigned to vessel, updating shipment status to IN_TRANSIT\n")
					
					// E. UPDATE SHIPMENT STATUS to IN_TRANSIT (vessel is now moving)
					h.repo.UpdateStatus(c.Context(), shipment.ID, "IN_TRANSIT")
					
					// F. Update ALL pending shipments on this vessel to IN_TRANSIT
					h.repo.UpdateStatusByVessel(c.Context(), *shipment.VesselID, "PENDING", "IN_TRANSIT")
					
					// Update the local struct so the JSON response is correct immediately
					shipment.Status = "IN_TRANSIT"
				}
			} else {
				fmt.Printf("❌ Failed to create route: %v\n", err)
			}
		}
	}

	return c.Status(201).JSON(shipment)
}

func (h *ShipmentHandler) GetShipmentByTracking(c *fiber.Ctx) error {
	trackingNum := c.Params("trackingNumber")
	shipment, err := h.repo.GetByTrackingNumber(c.Context(), trackingNum)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Shipment not found"})
	}
	return c.JSON(shipment)
}

func (h *ShipmentHandler) GetAllShipments(c *fiber.Ctx) error {
	shipments, err := h.repo.GetAll(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch shipments"})
	}
	if shipments == nil {
		shipments = []models.Shipment{}
	}
	return c.JSON(shipments)
}

func (h *ShipmentHandler) DownloadBOL(c *fiber.Ctx) error {
    trackingNum := c.Params("trackingNumber")
    
    // 1. Get Data
    shipment, err := h.repo.GetByTrackingNumber(c.Context(), trackingNum)
    if err != nil {
        return c.Status(404).JSON(fiber.Map{"error": "Shipment not found"})
    }

    // 2. Get Vessel Name (Optional check)
    vesselName := "Unassigned"
    if shipment.VesselID != nil {
        vessel, _ := h.vesselRepo.GetByID(c.Context(), *shipment.VesselID)
        if vessel != nil {
            vesselName = vessel.Name
        }
    }

    // 3. Generate PDF
    pdfBytes, err := h.pdfService.GenerateBillOfLading(shipment, vesselName)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Failed to generate PDF"})
    }

    // 4. Send File
    c.Set("Content-Type", "application/pdf")
    c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=BOL-%s.pdf", trackingNum))
    return c.Send(pdfBytes)
}

// GetShipmentsByVessel handles GET /api/vessels/:vesselId/shipments
func (h *ShipmentHandler) GetShipmentsByVessel(c *fiber.Ctx) error {
    vesselID := c.Params("vesselId")
    
    // Validate UUID format (optional but recommended)
    if vesselID == "" {
        return c.Status(400).JSON(fiber.Map{"error": "Vessel ID is required"})
    }

    shipments, err := h.repo.GetByVesselID(c.Context(), vesselID)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch vessel manifest"})
    }

    // Return metadata with results
    return c.JSON(fiber.Map{
        "vessel_id": vesselID,
        "count":     len(shipments),
        "shipments": shipments,
    })
}

// DeleteShipment handles DELETE /api/shipments/:id
func (h *ShipmentHandler) DeleteShipment(c *fiber.Ctx) error {
	shipmentID := c.Params("id")
	
	if shipmentID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Shipment ID is required"})
	}
	
	if err := h.repo.Delete(c.Context(), shipmentID); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.Status(200).JSON(fiber.Map{"message": "Shipment deleted successfully"})
}

// UpdateShipment handles PUT /api/shipments/:id
func (h *ShipmentHandler) UpdateShipment(c *fiber.Ctx) error {
	shipmentID := c.Params("id")
	
	if shipmentID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Shipment ID is required"})
	}
	
	var shipment models.Shipment
	if err := c.BodyParser(&shipment); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	// Set the ID from URL params
	shipment.ID = shipmentID
	
	if err := h.repo.Update(c.Context(), &shipment); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.Status(200).JSON(shipment)
}