package handlers

import (
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type TerminalHandler struct {
    repo *repository.TerminalRepository
}

func NewTerminalHandler(repo *repository.TerminalRepository) *TerminalHandler {
    return &TerminalHandler{repo: repo}
}

// GetPortTerminals handles GET /api/ports/:portId/terminals
func (h *TerminalHandler) GetPortTerminals(c *fiber.Ctx) error {
    portID := c.Params("portId")

    // Validate port ID
    if portID == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Port ID is required",
        })
    }

    // Fetch terminals with nested berths
    terminals, err := h.repo.GetByPortID(c.Context(), portID)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch port terminals",
        })
    }

    // Return metadata with results
    return c.JSON(fiber.Map{
        "port_id":         portID,
        "terminal_count":  len(terminals),
        "terminals":       terminals,
    })
}