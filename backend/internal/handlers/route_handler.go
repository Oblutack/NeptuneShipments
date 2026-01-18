package handlers

import (
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type RouteHandler struct {
	repo *repository.RouteRepository
}

func NewRouteHandler(repo *repository.RouteRepository) *RouteHandler {
	return &RouteHandler{repo: repo}
}

func (h *RouteHandler) GetRoute(c *fiber.Ctx) error {
	id := c.Params("id")
	route, err := h.repo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Route not found"})
	}
	return c.JSON(route)
}