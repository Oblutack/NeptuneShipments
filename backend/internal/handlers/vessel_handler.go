package handlers

import (
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type VesselHandler struct {
    repo *repository.VesselRepository
}

func NewVesselHandler(repo *repository.VesselRepository) *VesselHandler {
    return &VesselHandler{
        repo: repo,
    }
}


func (h *VesselHandler) CreateVessel(c *fiber.Ctx) error {
    var vessel models.Vessel

    // Parse request body
    if err := c.BodyParser(&vessel); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    // Validate required fields
    if vessel.Name == "" || vessel.IMONumber == "" || vessel.FlagCountry == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Missing required fields: name, imo_number, or flag_country",
        })
    }

    if vessel.Type == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "vessel type is required (TANKER, CONTAINER, BULK, LNG)",
        })
    }

    // Set default status 
    if vessel.Status == "" {
        vessel.Status = "DOCKED"
    }

    // Create vessel in database
    if err := h.repo.Create(c.Context(), &vessel); err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to create vessel",
        })
    }

    // Return 201 Created with the new vessel
    return c.Status(fiber.StatusCreated).JSON(vessel)
}

// GetAllVessels handles GET /api/vessels
func (h *VesselHandler) GetAllVessels(c *fiber.Ctx) error {
    vessels, err := h.repo.GetAll(c.Context())
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch vessels",
        })
    }
    // Return empty list instead of null if none found
    if vessels == nil {
        vessels = []models.Vessel{}
    }
    return c.JSON(vessels)
}

func (h *VesselHandler) GetVesselByID(c *fiber.Ctx) error {
	id := c.Params("id")
	vessel, err := h.repo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Vessel not found"})
	}
	return c.JSON(vessel)
}