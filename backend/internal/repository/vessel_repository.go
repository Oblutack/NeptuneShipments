package repository

import (
	"context"
	"fmt"
	"log"
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

func (r *VesselRepository) Update(ctx context.Context, vessel *models.Vessel) error {
    query := `
        UPDATE vessels 
        SET 
            name = $1,
            imo_number = $2,
            type = $3,
            status = $4,
            location = ST_SetSRID(ST_MakePoint($5, $6), 4326),
            heading = $7,
            speed_knots = $8,
            fuel_level = $9,
            fuel_capacity = $10,
            updated_at = NOW()
        WHERE id = $11
        RETURNING updated_at
    `

    err := r.db.QueryRow(
        ctx, query,
        vessel.Name, vessel.IMONumber, vessel.Type, vessel.Status,
        vessel.Longitude, vessel.Latitude,
        vessel.Heading, vessel.SpeedKnots, vessel.FuelLevel, vessel.FuelCapacity,
        vessel.ID,
    ).Scan(&vessel.UpdatedAt)

    if err != nil {
        return fmt.Errorf("failed to update vessel: %w", err)
    }

    return nil
}

// ✅ NEW: Delete removes a vessel by ID
// NOTE: This checks for active dependencies before deletion
func (r *VesselRepository) Delete(ctx context.Context, id string) error {
    // Check for active dependencies
    var activeRoutes, activeShipments, activeAllocations int

    // Check active routes
    err := r.db.QueryRow(ctx,
        `SELECT COUNT(*) FROM routes WHERE vessel_id = $1 AND status = 'ACTIVE'`,
        id,
    ).Scan(&activeRoutes)
    if err != nil {
        return fmt.Errorf("failed to check active routes: %w", err)
    }

    // Check active shipments
    err = r.db.QueryRow(ctx,
        `SELECT COUNT(*) FROM shipments WHERE vessel_id = $1 AND status IN ('IN_TRANSIT', 'LOADING')`,
        id,
    ).Scan(&activeShipments)
    if err != nil {
        return fmt.Errorf("failed to check active shipments: %w", err)
    }

    // Check active allocations
    err = r.db.QueryRow(ctx,
        `SELECT COUNT(*) FROM berth_allocations WHERE vessel_id = $1 AND status IN ('SCHEDULED', 'ACTIVE')`,
        id,
    ).Scan(&activeAllocations)
    if err != nil {
        return fmt.Errorf("failed to check active allocations: %w", err)
    }

    // Return error if vessel has active dependencies
    if activeRoutes > 0 || activeShipments > 0 || activeAllocations > 0 {
        return fmt.Errorf(
            "cannot delete vessel: has %d active routes, %d active shipments, and %d active allocations. Please complete or cancel them first",
            activeRoutes, activeShipments, activeAllocations,
        )
    }

    // Proceed with deletion
    query := `DELETE FROM vessels WHERE id = $1`
    result, err := r.db.Exec(ctx, query, id)
    if err != nil {
        return fmt.Errorf("failed to delete vessel: %w", err)
    }

    if result.RowsAffected() == 0 {
        return fmt.Errorf("vessel not found")
    }

    return nil
}

// BulkCreate inserts multiple vessels in a transaction
func (r *VesselRepository) BulkCreate(ctx context.Context, vessels []models.Vessel) error {
    tx, err := r.db.Begin(ctx)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer tx.Rollback(ctx)

    query := `
        INSERT INTO vessels (
            name, imo_number, type, status, location,
            heading, speed_knots, fuel_level, fuel_capacity
        ) VALUES (
            $1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326),
            $7, $8, $9, $10
        )
    `

    for _, vessel := range vessels {
        _, err := tx.Exec(
            ctx, query,
            vessel.Name, vessel.IMONumber, vessel.Type, vessel.Status,
            vessel.Longitude, vessel.Latitude,
            vessel.Heading, vessel.SpeedKnots, vessel.FuelLevel, vessel.FuelCapacity,
        )
        if err != nil {
            return fmt.Errorf("failed to insert vessel %s: %w", vessel.Name, err)
        }
    }

    if err := tx.Commit(ctx); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
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

// RecoverFromDistress restores a vessel from DISTRESS to ANCHORED
func (r *VesselRepository) RecoverFromDistress(ctx context.Context, id string) error {
	query := `UPDATE vessels SET status = 'ANCHORED', speed_knots = 0 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

// SetDockedWithRoute docks a vessel, moves it to the destination port, and activates berth allocation
func (r *VesselRepository) SetDockedWithRoute(ctx context.Context, vesselID, routeID string) error {
	// Start transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get destination port location from route
	var portLat, portLon float64
	portQuery := `
		SELECT ST_Y(p.location::geometry), ST_X(p.location::geometry)
		FROM routes r
		JOIN ports p ON r.destination_port_id = p.id
		WHERE r.id = $1
	`
	err = tx.QueryRow(ctx, portQuery, routeID).Scan(&portLat, &portLon)
	if err != nil {
		return fmt.Errorf("failed to get port location: %w", err)
	}

	// Update vessel: set DOCKED status, move to port, stop movement
	vesselQuery := `
		UPDATE vessels 
		SET 
			status = 'DOCKED',
			speed_knots = 0,
			location = ST_SetSRID(ST_MakePoint($2, $3), 4326)
		WHERE id = $1
	`
	_, err = tx.Exec(ctx, vesselQuery, vesselID, portLon, portLat)
	if err != nil {
		return fmt.Errorf("failed to dock vessel: %w", err)
	}

	// Activate berth allocation if it exists
	allocationQuery := `
		UPDATE berth_allocations
		SET status = 'ACTIVE'
		WHERE vessel_id = $1 AND status = 'SCHEDULED'
	`
	_, err = tx.Exec(ctx, allocationQuery, vesselID)
	if err != nil {
		return fmt.Errorf("failed to activate berth allocation: %w", err)
	}

	// Mark berth as occupied
	berthQuery := `
		UPDATE berths
		SET is_occupied = true, current_vessel_id = $1
		WHERE id = (SELECT berth_id FROM berth_allocations WHERE vessel_id = $1 AND status = 'ACTIVE')
	`
	_, err = tx.Exec(ctx, berthQuery, vesselID)
	if err != nil {
		// Not critical if berth update fails (vessel might not have allocation)
		log.Printf("Warning: Failed to update berth occupancy: %v", err)
	}

	// Update shipments to DELIVERED
	shipmentQuery := `
		UPDATE shipments 
		SET status = 'DELIVERED', updated_at = NOW() 
		WHERE vessel_id = $1 AND status = 'IN_TRANSIT'
	`
	_, err = tx.Exec(ctx, shipmentQuery, vesselID)
	if err != nil {
		return fmt.Errorf("failed to update shipments: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
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