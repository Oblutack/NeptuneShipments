package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VesselRepository struct {
    db *pgxpool.Pool
}

func NewVesselRepository(db *pgxpool.Pool) *VesselRepository {
    return &VesselRepository{
        db: db,
    }
}

func (r *VesselRepository) Create(ctx context.Context, vessel *models.Vessel) error {
    query := `
        INSERT INTO vessels (
            name,
            imo_number,
            flag_country,
            type,
            status,
            capacity_teu,
            capacity_barrels,
            location,
            heading,
            speed_knots,
            last_updated,
            created_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            ST_SetSRID(ST_MakePoint($8, $9), 4326),
            $10, $11, $12, $13
        )
        RETURNING id, created_at, last_updated
    `

    now := time.Now()
    if vessel.CreatedAt.IsZero() {
        vessel.CreatedAt = now
    }
    if vessel.LastUpdated.IsZero() {
        vessel.LastUpdated = now
    }

    err := r.db.QueryRow(
        ctx,
        query,
        vessel.Name,
        vessel.IMONumber,
        vessel.FlagCountry,
        vessel.Type,
        vessel.Status,
        vessel.CapacityTEU,
        vessel.CapacityBarrels,
        vessel.Longitude, 
        vessel.Latitude,
        vessel.Heading,
        vessel.SpeedKnots,
        vessel.LastUpdated,
        vessel.CreatedAt,
    ).Scan(&vessel.ID, &vessel.CreatedAt, &vessel.LastUpdated)

    if err != nil {
        return fmt.Errorf("failed to create vessel: %w", err)
    }

    return nil
}

// GetAll retrieves all vessels
func (r *VesselRepository) GetAll(ctx context.Context) ([]models.Vessel, error) {
    // --- UPDATED QUERY to include route columns ---
    query := `
        SELECT id, name, imo_number, flag_country, type, status, 
               capacity_teu, capacity_barrels,
               ST_Y(location::geometry) as lat, 
               ST_X(location::geometry) as lon, 
               heading, speed_knots, last_updated, created_at,
               current_route_id, route_progress,
               fuel_level, fuel_capacity
        FROM vessels
    `
    rows, err := r.db.Query(ctx, query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var vessels []models.Vessel
    for rows.Next() {
        var v models.Vessel
        
        err := rows.Scan(
            &v.ID, &v.Name, &v.IMONumber, &v.FlagCountry, &v.Type, &v.Status,
            &v.CapacityTEU, &v.CapacityBarrels,
            &v.Latitude, &v.Longitude,
            &v.Heading, &v.SpeedKnots, &v.LastUpdated, &v.CreatedAt,
            &v.CurrentRouteID, &v.RouteProgress,
            &v.FuelLevel, &v.FuelCapacity, 
        )
        if err != nil {
            return nil, err
        }
        vessels = append(vessels, v)
    }
    return vessels, nil
}

// GetByID finds a vessel by its UUID
// GetByID finds a vessel by its UUID
func (r *VesselRepository) GetByID(ctx context.Context, id string) (*models.Vessel, error) {
	query := `
		SELECT id, name, imo_number, flag_country, type, status, 
		       capacity_teu, capacity_barrels,
		       ST_Y(location::geometry) as latitude,
		       ST_X(location::geometry) as longitude,
		       heading, speed_knots, last_updated, created_at,
               -- Added these two:
               current_route_id, route_progress
		FROM vessels
		WHERE id = $1
	`
	var v models.Vessel
	err := r.db.QueryRow(ctx, query, id).Scan(
		&v.ID, &v.Name, &v.IMONumber, &v.FlagCountry, &v.Type, &v.Status,
		&v.CapacityTEU, &v.CapacityBarrels,
		&v.Latitude, &v.Longitude,
		&v.Heading, &v.SpeedKnots, &v.LastUpdated, &v.CreatedAt,
        // Added these two:
        &v.CurrentRouteID, &v.RouteProgress,
	)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

// UpdatePosition updates just the location of a vessel
func (r *VesselRepository) UpdatePosition(ctx context.Context, id string, lat, lon float64) error {
	query := `
		UPDATE vessels 
		SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
		    last_updated = NOW()
		WHERE id = $3
	`
    // Use Exec() for updates that don't return data
	_, err := r.db.Exec(ctx, query, lon, lat, id)
	return err
}

// UpdateProgress moves the ship along the pre-defined route
// progress is a value between 0.0 and 1.0
func (r *VesselRepository) UpdateProgress(ctx context.Context, vesselID string, progress float64, fuelLevel float64) error {
    // 1. Calculate new point on the line (Interpolate)
    // 2. Update the vessel's location column AND the progress column
    query := `
        WITH route_info AS (
            SELECT r.path FROM routes r
            JOIN vessels v ON v.current_route_id = r.id
            WHERE v.id = $1
        )
        UPDATE vessels
        SET 
            route_progress = $2,
            fuel_level = $3,
            -- Magic PostGIS function: Find point at X percent along line
            location = (
                SELECT ST_LineInterpolatePoint(path::geometry, $2)::geography 
                FROM route_info
            ),
            last_updated = NOW()
        WHERE id = $1
    `
    _, err := r.db.Exec(ctx, query, vesselID, progress, fuelLevel)
    return err
}

// SetDocked stops the ship AND updates all its cargo to 'DELIVERED'
func (r *VesselRepository) SetDocked(ctx context.Context, id string) error {
	// 1. Stop the Ship
	queryVessel := `UPDATE vessels SET status = 'DOCKED', speed_knots = 0 WHERE id = $1`
	_, err := r.db.Exec(ctx, queryVessel, id)
	if err != nil {
		return err
	}

	// 2. Update Cargo Status
	// CHANGE 'ARRIVED' TO 'DELIVERED' to match your Database Enum
	queryShipment := `
		UPDATE shipments 
		SET status = 'DELIVERED', updated_at = NOW() 
		WHERE vessel_id = $1 AND status = 'IN_TRANSIT'
	`
	_, err = r.db.Exec(ctx, queryShipment, id)
	return err
}

// SetDistress stops the ship due to empty fuel
func (r *VesselRepository) SetDistress(ctx context.Context, id string) error {
	query := `UPDATE vessels SET status = 'DISTRESS', speed_knots = 0 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

// RefuelVessel resets fuel to capacity and restarts the engine
func (r *VesselRepository) RefuelVessel(ctx context.Context, id string) error {
	query := `
		UPDATE vessels 
		SET 
			fuel_level = fuel_capacity, -- Fill it up
			status = 'AT_SEA',          -- Clear DISTRESS status
			speed_knots = 5000.0        -- Restart engine (Fast speed for demo)
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

// AssignRoute sets the ship's current route and resets progress to 0
func (r *VesselRepository) AssignRoute(ctx context.Context, vesselID, routeID string) error {
	query := `
		UPDATE vessels 
		SET 
			current_route_id = $1, 
			route_progress = 0.0, 
			status = 'AT_SEA', 
			speed_knots = 1500.0, -- Fast for demo
			fuel_level = fuel_capacity, -- <--- REFUEL HERE!
			location = (SELECT ST_StartPoint(path::geometry)::geography FROM routes WHERE id = $1)
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, query, routeID, vesselID)
	return err
}

func (r *VesselRepository) CreateOrUpdate(ctx context.Context, v *models.Vessel) error {
    query := `
        INSERT INTO vessels (name, imo_number, flag_country, type, status, capacity_teu, capacity_barrels, location, heading, speed_knots, fuel_capacity, fuel_level)
        VALUES ($1, $2, $3, $4, 'AT_SEA', $5, $6, ST_SetSRID(ST_MakePoint($8, $7), 4326), 0, $9, $10, $11)
        ON CONFLICT (imo_number) DO UPDATE 
        SET name = EXCLUDED.name, fuel_level = EXCLUDED.fuel_level -- Update fuel on reset
        RETURNING id
    `
    err := r.db.QueryRow(ctx, query, 
        v.Name, v.IMONumber, v.FlagCountry, v.Type, v.CapacityTEU, v.CapacityBarrels, v.Latitude, v.Longitude, v.SpeedKnots, v.FuelCapacity, v.FuelLevel,
    ).Scan(&v.ID)
    return err
}

func (r *VesselRepository) GetIDByIMO(ctx context.Context, imo string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx, "SELECT id FROM vessels WHERE imo_number = $1", imo).Scan(&id)
	return id, err
}