package handlers

import (
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type ComponentHandler struct {
    repo *repository.ComponentRepository
}

func NewComponentHandler(repo *repository.ComponentRepository) *ComponentHandler {
    return &ComponentHandler{repo: repo}
}

// GetComponents handles GET /api/vessels/:vesselId/components
func (h *ComponentHandler) GetComponents(c *fiber.Ctx) error {
    vesselID := c.Params("vesselId")

    if vesselID == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Vessel ID is required",
        })
    }

    components, err := h.repo.GetByVesselID(c.Context(), vesselID)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch components",
        })
    }

    // Calculate summary stats
    var criticalCount, warningCount, operationalCount int
    for _, comp := range components {
        switch comp.Status {
        case "CRITICAL":
            criticalCount++
        case "WARNING":
            warningCount++
        case "OPERATIONAL":
            operationalCount++
        }
    }

    return c.JSON(fiber.Map{
        "vessel_id":   vesselID,
        "total_count": len(components),
        "summary": fiber.Map{
            "critical":    criticalCount,
            "warning":     warningCount,
            "operational": operationalCount,
        },
        "components": components,
    })
}

// PerformMaintenance handles POST /api/components/:id/maintain
func (h *ComponentHandler) PerformMaintenance(c *fiber.Ctx) error {
    componentID := c.Params("id")

    if componentID == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Component ID is required",
        })
    }

    // Perform maintenance
    err := h.repo.MaintainComponent(c.Context(), componentID)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to perform maintenance",
        })
    }

    // Return updated component
    component, err := h.repo.GetByID(c.Context(), componentID)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Maintenance completed but failed to retrieve updated component",
        })
    }

    return c.JSON(fiber.Map{
        "status":    "success",
        "message":   "Component serviced successfully",
        "component": component,
    })
}