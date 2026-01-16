package handlers

import (
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type ShipmentHandler struct {
	repo *repository.ShipmentRepository
}

func NewShipmentHandler(repo *repository.ShipmentRepository) *ShipmentHandler {
	return &ShipmentHandler{repo: repo}
}

func (h *ShipmentHandler) CreateShipment(c *fiber.Ctx) error {
	var shipment models.Shipment
	if err := c.BodyParser(&shipment); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	if err := h.repo.Create(c.Context(), &shipment); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(shipment)
}

func (h *ShipmentHandler) GetAllShipments(c *fiber.Ctx) error {
	shipments, err := h.repo.GetAll(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch shipments"})
	}
	if shipments == nil {
		shipments = []models.Shipment{}
	}
	return c.JSON(shipments)
}

func (h *ShipmentHandler) GetShipmentByTracking(c *fiber.Ctx) error {
	trackingNum := c.Params("trackingNumber")
	shipment, err := h.repo.GetByTrackingNumber(c.Context(), trackingNum)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Shipment not found"})
	}
	return c.JSON(shipment)
}