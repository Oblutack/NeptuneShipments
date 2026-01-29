package handlers

import (
    "github.com/Oblutack/NeptuneShipments/backend/internal/repository"
    "github.com/gofiber/fiber/v2"
)

type FinanceHandler struct {
    repo *repository.FinanceRepository
}

func NewFinanceHandler(repo *repository.FinanceRepository) *FinanceHandler {
    return &FinanceHandler{repo: repo}
}

// GetStats handles GET /api/finance/stats
func (h *FinanceHandler) GetStats(c *fiber.Ctx) error {
    stats, err := h.repo.GetStats(c.Context())
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch financial statistics",
        })
    }

    return c.JSON(stats)
}