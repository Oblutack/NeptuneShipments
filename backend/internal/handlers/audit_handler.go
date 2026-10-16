package handlers

import (
	"strconv"

	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type AuditHandler struct {
	repo *repository.AuditRepository
}

func NewAuditHandler(repo *repository.AuditRepository) *AuditHandler {
	return &AuditHandler{repo: repo}
}

// GetAuditLog returns the most recent admin actions, newest first.
// Admin-only - wired behind requireAdmin in main.go.
func (h *AuditHandler) GetAuditLog(c *fiber.Ctx) error {
	limit, err := strconv.Atoi(c.Query("limit", "100"))
	if err != nil || limit <= 0 || limit > 500 {
		limit = 100
	}
	offset, err := strconv.Atoi(c.Query("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	entries, err := h.repo.List(c.Context(), limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch audit log"})
	}

	return c.JSON(fiber.Map{
		"entries": entries,
		"count":   len(entries),
	})
}
