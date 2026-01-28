package handlers

import (
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type CrewHandler struct {
    repo *repository.CrewRepository
}

func NewCrewHandler(repo *repository.CrewRepository) *CrewHandler {
    return &CrewHandler{repo: repo}
}

// GetAllCrew handles GET /api/crew
func (h *CrewHandler) GetAllCrew(c *fiber.Ctx) error {
    crew, err := h.repo.GetAll(c.Context())
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch crew members",
        })
    }

    return c.JSON(fiber.Map{
        "total": len(crew),
        "crew":  crew,
    })
}

// GetCrewByVessel handles GET /api/vessels/:id/crew
func (h *CrewHandler) GetCrewByVessel(c *fiber.Ctx) error {
    vesselID := c.Params("id")

    if vesselID == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Vessel ID is required",
        })
    }

    crew, err := h.repo.GetByVesselID(c.Context(), vesselID)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch crew for vessel",
        })
    }

    return c.JSON(fiber.Map{
        "vessel_id": vesselID,
        "total":     len(crew),
        "crew":      crew,
    })
}