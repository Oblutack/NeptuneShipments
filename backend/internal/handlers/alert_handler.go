package handlers

import (
	"errors"
	"log"
	"strconv"

	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

const (
	defaultAlertLimit = 50
	maxAlertLimit     = 200
)

type AlertHandler struct {
	repo *repository.AlertRepository
}

func NewAlertHandler(repo *repository.AlertRepository) *AlertHandler {
	return &AlertHandler{repo: repo}
}

// GetAlerts lists persisted alerts, newest first (unresolved CRITICAL
// conditions ahead of the rest).
//
//	?status=open (default)  alerts nobody has acknowledged yet
//	?status=all             the full history
//	?limit=N                at most N (default 50, max 200)
func (h *AlertHandler) GetAlerts(c *fiber.Ctx) error {
	status := c.Query("status", "open")
	if status != "open" && status != "all" {
		return c.Status(400).JSON(fiber.Map{"error": "status must be 'open' or 'all'"})
	}

	limit := defaultAlertLimit
	if raw := c.Query("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 {
			return c.Status(400).JSON(fiber.Map{"error": "limit must be a positive integer"})
		}
		limit = min(n, maxAlertLimit)
	}

	alerts, err := h.repo.List(c.Context(), status == "open", limit)
	if err != nil {
		log.Printf("Failed to list alerts: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch alerts"})
	}
	return c.JSON(alerts)
}

// AcknowledgeAlert marks an alert as seen by the requesting admin.
// Acknowledging an already-acknowledged alert succeeds and changes nothing.
func (h *AlertHandler) AcknowledgeAlert(c *fiber.Ctx) error {
	userID, _ := currentUserID(c)

	alert, err := h.repo.Acknowledge(c.Context(), c.Params("id"), userID)
	if errors.Is(err, repository.ErrAlertNotFound) {
		return c.Status(404).JSON(fiber.Map{"error": "Alert not found"})
	}
	if err != nil {
		log.Printf("Failed to acknowledge alert: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to acknowledge alert"})
	}
	return c.JSON(alert)
}
