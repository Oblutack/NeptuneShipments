package handlers

import (
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type TankHandler struct {
	repo *repository.TankRepository
}

func NewTankHandler(repo *repository.TankRepository) *TankHandler {
	return &TankHandler{repo: repo}
}

func (h *TankHandler) GetTanks(c *fiber.Ctx) error {
	vesselID := c.Params("vesselId")
	tanks, err := h.repo.GetByVesselID(c.Context(), vesselID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch tanks"})
	}
	
	// Ensure we return an empty array [] instead of null if no tanks found
	if tanks == nil {
		tanks = []models.Tank{}
	}
	
	return c.JSON(tanks)
}