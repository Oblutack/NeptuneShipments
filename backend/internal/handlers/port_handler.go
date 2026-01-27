package handlers

import (
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type PortHandler struct {
    repo *repository.PortRepository
}

func NewPortHandler(repo *repository.PortRepository) *PortHandler {
    return &PortHandler{repo: repo}
}

func (h *PortHandler) GetAllPorts(c *fiber.Ctx) error {
    ports, err := h.repo.GetAll(c.Context())
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(ports)
}

// GetPortStats handles GET /api/ports/stats
func (h *PortHandler) GetPortStats(c *fiber.Ctx) error {
    stats, err := h.repo.GetPortStats(c.Context())
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch port statistics",
        })
    }

    return c.JSON(fiber.Map{
        "total_ports": len(stats),
        "ports":       stats,
    })
}