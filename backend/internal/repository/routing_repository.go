package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
)

type RoutingRepository struct {
	db *database.Service
}

func NewRoutingRepository(db *database.Service) *RoutingRepository {
	return &RoutingRepository{db: db}
}

// CalculatePath finds the shortest water route between two points using pgRouting
func (r *RoutingRepository) CalculatePath(ctx context.Context, startLat, startLon, endLat, endLon float64) (json.RawMessage, error) {
	
	query := `
		WITH start_node AS (
			SELECT id FROM ocean_network_vertices_pgr
			ORDER BY the_geom <-> ST_SetSRID(ST_MakePoint($2, $1), 4326) LIMIT 1
		),
		end_node AS (
			SELECT id FROM ocean_network_vertices_pgr
			ORDER BY the_geom <-> ST_SetSRID(ST_MakePoint($4, $3), 4326) LIMIT 1
		),
		path_result AS (
			SELECT * FROM pgr_dijkstra(
				'SELECT id, source, target, cost, reverse_cost FROM ocean_network',
				(SELECT id FROM start_node),
				(SELECT id FROM end_node),
				directed := false
			)
		)
		-- Combine all segments into one GeoJSON LineString
		SELECT ST_AsGeoJSON(ST_Union(geom))
		FROM path_result
		JOIN ocean_network ON edge = id;
	`

	var geoJSON []byte
	err := r.db.GetPool().QueryRow(ctx, query, startLat, startLon, endLat, endLon).Scan(&geoJSON)
	
	if err != nil {
		return nil, fmt.Errorf("failed to calculate path: %w", err)
	}
	
	// If no path found (e.g. asking to go to a landlocked lake), return null
	if len(geoJSON) == 0 {
		return nil, fmt.Errorf("no path found between coordinates")
	}

	return json.RawMessage(geoJSON), nil
}

// GetAllEdges returns the entire routing network as a GeoJSON MultiLineString
func (r *RoutingRepository) GetAllEdges(ctx context.Context) ([]byte, error) {
	// ST_Collect merges all lines into one big geometry collection
	query := `
		SELECT ST_AsGeoJSON(ST_Collect(geom))
		FROM ocean_network
	`
	var geoJSON []byte
	err := r.db.GetPool().QueryRow(ctx, query).Scan(&geoJSON)
	return geoJSON, err
}