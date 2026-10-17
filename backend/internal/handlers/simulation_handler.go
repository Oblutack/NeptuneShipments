package handlers

import (
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type SimulationHandler struct {
	repo *repository.SimulationRepository
}

func NewSimulationHandler(repo *repository.SimulationRepository) *SimulationHandler {
	return &SimulationHandler{repo: repo}
}

// ResetSimulation handles POST /api/simulation/reset
func (h *SimulationHandler) ResetSimulation(c *fiber.Ctx) error {
	if err := h.repo.Reset(c.Context()); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to reset simulation",
		})
	}
	return c.JSON(fiber.Map{"message": "Simulation reset"})
}
