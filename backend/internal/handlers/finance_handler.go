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

// GetRevenueTrend handles GET /api/finance/revenue-trend?days=7
func (h *FinanceHandler) GetRevenueTrend(c *fiber.Ctx) error {
	days := c.QueryInt("days", 7)
	if days < 1 || days > 90 {
		days = 7
	}

	points, err := h.repo.GetDailyRevenue(c.Context(), days)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch revenue trend",
		})
	}

	return c.JSON(points)
}
