package handlers

import (
    "time"

    "github.com/Oblutack/NeptuneShipments/backend/internal/models"
    "github.com/Oblutack/NeptuneShipments/backend/internal/repository"
    "github.com/gofiber/fiber/v2"
)

type AllocationHandler struct {
    repo *repository.AllocationRepository
}

func NewAllocationHandler(repo *repository.AllocationRepository) *AllocationHandler {
    return &AllocationHandler{repo: repo}
}

// GetSchedule handles GET /api/ports/:portId/schedule
func (h *AllocationHandler) GetSchedule(c *fiber.Ctx) error {
    portID := c.Params("portId")

    // Parse query parameters for date range (default: today to +7 days)
    startDateStr := c.Query("start_date", time.Now().Format("2006-01-02"))
    endDateStr := c.Query("end_date", time.Now().AddDate(0, 0, 7).Format("2006-01-02"))

    startDate, err := time.Parse("2006-01-02", startDateStr)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid start_date format (use YYYY-MM-DD)",
        })
    }

    endDate, err := time.Parse("2006-01-02", endDateStr)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid end_date format (use YYYY-MM-DD)",
        })
    }

    // Fetch allocations
    allocations, err := h.repo.GetByPortID(c.Context(), portID, startDate, endDate)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch schedule",
        })
    }

    return c.JSON(fiber.Map{
        "port_id":     portID,
        "start_date":  startDate,
        "end_date":    endDate,
        "allocations": allocations,
    })
}

// CreateAllocation handles POST /api/allocations
func (h *AllocationHandler) CreateAllocation(c *fiber.Ctx) error {
    type Request struct {
        VesselID      string `json:"vessel_id"`
        BerthID       string `json:"berth_id"`
        StartTime     string `json:"start_time"` // ISO 8601 format
        DurationHours int    `json:"duration_hours"`
        Notes         string `json:"notes"`
    }

    var req Request
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    // Validate inputs
    if req.VesselID == "" || req.BerthID == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "vessel_id and berth_id are required",
        })
    }

    if req.DurationHours < 1 || req.DurationHours > 168 {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "duration_hours must be between 1 and 168 (7 days)",
        })
    }

    // Parse start time
    startTime, err := time.Parse(time.RFC3339, req.StartTime)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid start_time format (use ISO 8601)",
        })
    }

    // Calculate end time
    endTime := startTime.Add(time.Duration(req.DurationHours) * time.Hour)

    // Create allocation
    allocation := &models.BerthAllocation{
        VesselID:  req.VesselID,
        BerthID:   req.BerthID,
        StartTime: startTime,
        EndTime:   endTime,
        Status:    "SCHEDULED",
        Notes:     req.Notes,
    }

    err = h.repo.Create(c.Context(), allocation)
    if err != nil {
        return c.Status(fiber.StatusConflict).JSON(fiber.Map{
            "error": err.Error(),
        })
    }

    return c.Status(fiber.StatusCreated).JSON(allocation)
}

// GetUnassignedVessels handles GET /api/allocations/unassigned
func (h *AllocationHandler) GetUnassignedVessels(c *fiber.Ctx) error {
    vessels, err := h.repo.GetUnassignedVessels(c.Context())
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to fetch unassigned vessels",
        })
    }

    return c.JSON(fiber.Map{
        "count":   len(vessels),
        "vessels": vessels,
    })
}