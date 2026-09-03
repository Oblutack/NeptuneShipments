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

type assignCrewRequest struct {
    VesselID *string `json:"vessel_id"`
}

// AssignCrew handles PUT /api/crew/:id/assign. Covers assign, transfer,
// and remove alike - a nil vessel_id in the body clears the assignment.
func (h *CrewHandler) AssignCrew(c *fiber.Ctx) error {
    crewID := c.Params("id")
    if crewID == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Crew ID is required"})
    }

    var body assignCrewRequest
    if err := c.BodyParser(&body); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }

    if err := h.repo.AssignToVessel(c.Context(), crewID, body.VesselID); err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"message": "Crew assignment updated"})
}