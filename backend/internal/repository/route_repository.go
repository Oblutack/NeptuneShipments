package repository

import (
	"context"
	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type RouteRepository struct {
	db *database.Service
}

func NewRouteRepository(db *database.Service) *RouteRepository {
	return &RouteRepository{db: db}
}

// GetByID fetches a route and converts its path to GeoJSON
func (r *RouteRepository) GetByID(ctx context.Context, id string) (*models.Route, error) {
	query := `
		SELECT id, name, ST_AsGeoJSON(path::geometry) as path, created_at
		FROM routes
		WHERE id = $1
	`
	var route models.Route
	// We scan the path string directly into RawMessage bytes
	var pathJSON []byte
	
	err := r.db.GetPool().QueryRow(ctx, query, id).Scan(
		&route.ID, &route.Name, &pathJSON, &route.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	
	route.Path = pathJSON
	return &route, nil
}