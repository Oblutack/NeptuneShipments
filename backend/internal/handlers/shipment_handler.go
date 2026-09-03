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

	// 1. Look up the assigned vessel (if any) once. Its current state
	// decides both the shipment's initial status and whether a new
	// route needs to be calculated at all (a vessel already AT_SEA
	// keeps its current route/progress untouched - see step 3).
	var vessel *models.Vessel
	initialStatus := "PENDING"
	if shipment.VesselID != nil && *shipment.VesselID != "" {
		v, err := h.vesselRepo.GetByID(c.Context(), *shipment.VesselID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Assigned vessel not found"})
		}
		vessel = v
		if vessel.Status == "AT_SEA" {
			// Vessel is already underway - piggyback this shipment on
			// the current voyage instead of recalculating its route.
			initialStatus = "IN_TRANSIT"
			fmt.Printf("✅ Vessel %s is already AT_SEA, setting shipment to IN_TRANSIT\n", vessel.Name)
		} else {
			fmt.Printf("⚓ Vessel %s is %s, shipment will be PENDING until vessel departs\n", vessel.Name, vessel.Status)
		}
	}
	shipment.Status = initialStatus

	// 2. Create the Shipment Record with correct initial status
	if err := h.repo.Create(c.Context(), &shipment); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// 3. AUTOMATIC ROUTING LOGIC
	// Only calculate/assign a route if the vessel actually needs one.
	// A vessel already AT_SEA is left alone: reassigning its route here
	// would reset route_progress back to 0 and restart its voyage.
	if vessel != nil && vessel.Status != "AT_SEA" {
		// A. Get Port Coordinates
		origin, err := h.portRepo.GetByID(c.Context(), shipment.OriginPortID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error":    "Shipment created but origin port lookup failed: " + err.Error(),
				"shipment": shipment,
			})
		}
		dest, err := h.portRepo.GetByID(c.Context(), shipment.DestinationPortID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error":    "Shipment created but destination port lookup failed: " + err.Error(),
				"shipment": shipment,
			})
		}

		// B. Calculate Path using pgRouting
		pathJSON, err := h.routingRepo.CalculatePath(c.Context(), origin.Latitude, origin.Longitude, dest.Latitude, dest.Longitude)
		if err != nil {
			fmt.Printf("❌ Routing Error: %v\n", err)
			return c.Status(502).JSON(fiber.Map{
				"error":    "Shipment created but automatic routing failed: " + err.Error(),
				"shipment": shipment,
			})
		}

		// C. Save the new Route (routes are unique per port pair - a
		// second voyage on the same lane reuses the existing route)
		routeName := fmt.Sprintf("%s to %s (Auto)", origin.Name, dest.Name)
		routeID, err := h.routeRepo.Create(c.Context(), routeName, shipment.OriginPortID, shipment.DestinationPortID, pathJSON)
		if err != nil {
			fmt.Printf("❌ Failed to create route: %v\n", err)
			return c.Status(502).JSON(fiber.Map{
				"error":    "Shipment created but route creation failed: " + err.Error(),
				"shipment": shipment,
			})
		}

		// D. Assign Route to Vessel (This sets vessel to AT_SEA and refuels it)
		if err := h.vesselRepo.AssignRoute(c.Context(), *shipment.VesselID, routeID); err != nil {
			fmt.Printf("❌ Failed to assign route to vessel: %v\n", err)
			return c.Status(502).JSON(fiber.Map{
				"error":    "Shipment created but vessel route assignment failed: " + err.Error(),
				"shipment": shipment,
			})
		}

		fmt.Printf("🚢 Route assigned to vessel, updating shipment status to IN_TRANSIT\n")

		// E. UPDATE SHIPMENT STATUS to IN_TRANSIT (vessel is now moving)
		h.repo.UpdateStatus(c.Context(), shipment.ID, "IN_TRANSIT")

		// F. Update ALL pending shipments on this vessel to IN_TRANSIT
		h.repo.UpdateStatusByVessel(c.Context(), *shipment.VesselID, "PENDING", "IN_TRANSIT")

		// Update the local struct so the JSON response is correct immediately
		shipment.Status = "IN_TRANSIT"
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