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
		SELECT id, name, origin_port_id, destination_port_id, ST_AsGeoJSON(path::geometry) as path, created_at
		FROM routes
		WHERE id = $1
	`
	var route models.Route
	// We scan the path string directly into RawMessage bytes
	var pathJSON []byte
	
	err := r.db.GetPool().QueryRow(ctx, query, id).Scan(
		&route.ID, &route.Name, &route.OriginPortID, &route.DestinationPortID, &pathJSON, &route.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	
	route.Path = pathJSON
	return &route, nil
}

// Create saves a new route geometry and returns its ID
func (r *RouteRepository) Create(ctx context.Context, name string, geoJSON []byte) (string, error) {
	query := `
		INSERT INTO routes (name, path)
		VALUES ($1, ST_LineMerge(ST_GeomFromGeoJSON($2)))
		RETURNING id
	`
	var id string
	err := r.db.GetPool().QueryRow(ctx, query, name, geoJSON).Scan(&id)
	return id, err
}

func (r *RouteRepository) CreateFromWKT(ctx context.Context, name, wkt, originPortID, destPortID string) error {
    query := `
        INSERT INTO routes (name, path, origin_port_id, destination_port_id)
        VALUES ($1, ST_GeogFromText($2), $3, $4)
        ON CONFLICT (name) DO UPDATE SET 
            path = EXCLUDED.path,
            origin_port_id = EXCLUDED.origin_port_id,
            destination_port_id = EXCLUDED.destination_port_id
    `
    _, err := r.db.GetPool().Exec(ctx, query, name, wkt, originPortID, destPortID)
    return err
}

// GetActiveRoutes returns paths for all vessels currently AT_SEA
func (r *RouteRepository) GetActiveRoutes(ctx context.Context) ([]byte, error) {
	// We build a GeoJSON FeatureCollection directly in SQL
	query := `
		SELECT json_build_object(
			'type', 'FeatureCollection',
			'features', json_agg(
				json_build_object(
					'type', 'Feature',
					'properties', json_build_object(
						'vessel_id', v.id,
						'route_name', r.name
					),
					'geometry', ST_AsGeoJSON(r.path)::json
				)
			)
		)
		FROM routes r
		JOIN vessels v ON v.current_route_id = r.id
		WHERE v.status = 'AT_SEA'
	`
	var geoJSON []byte
	err := r.db.GetPool().QueryRow(ctx, query).Scan(&geoJSON)
	
	// Handle empty result (NULL) -> Return empty collection
	if len(geoJSON) == 0 {
		return []byte(`{"type": "FeatureCollection", "features": []}`), nil
	}
	
	return geoJSON, err
}

