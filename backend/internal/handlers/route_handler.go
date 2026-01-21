package handlers

import (
	"github.com/Oblutack/NeptuneShipments/backend/internal/repository"
	"github.com/gofiber/fiber/v2"
)

type RouteHandler struct {
	repo *repository.RouteRepository
	routingRepo *repository.RoutingRepository
}

func NewRouteHandler(repo *repository.RouteRepository, routingRepo *repository.RoutingRepository) *RouteHandler {
	return &RouteHandler{
		repo:        repo,
		routingRepo: routingRepo,
	}
}

type CalculateRequest struct {
	StartLat float64 `json:"start_lat"`
	StartLon float64 `json:"start_lon"`
	EndLat   float64 `json:"end_lat"`
	EndLon   float64 `json:"end_lon"`
}

// CalculateRoute is a test endpoint to try the Dijkstra engine
func (h *RouteHandler) CalculateRoute(c *fiber.Ctx) error {
	var req CalculateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	path, err := h.routingRepo.CalculatePath(c.Context(), req.StartLat, req.StartLon, req.EndLat, req.EndLon)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"type": "Feature",
		"geometry": path,
	})
}

func (h *RouteHandler) GetRoute(c *fiber.Ctx) error {
	id := c.Params("id")
	route, err := h.repo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Route not found"})
	}
	return c.JSON(route)
}