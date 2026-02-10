package repository

import (
	"context"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type ShipmentRepository struct {
	db *database.Service
}

func NewShipmentRepository(db *database.Service) *ShipmentRepository {
	return &ShipmentRepository{db: db}
}

// Create inserts a new shipment
func (r *ShipmentRepository) Create(ctx context.Context, s *models.Shipment) error {
	query := `
		INSERT INTO shipments (
			tracking_number, customer_name, origin_port_id, destination_port_id, 
			vessel_id, description, container_number, weight_kg, status, eta, manifest_items
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at
	`
	
	// Default status if empty
	if s.Status == "" {
		s.Status = "PENDING"
	}

	err := r.db.GetPool().QueryRow(
		ctx, query,
		s.TrackingNumber, s.CustomerName, s.OriginPortID, s.DestinationPortID,
		s.VesselID, s.Description, s.ContainerNumber, s.WeightKG, s.Status, s.ETA, s.ManifestItems,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)

	return err
}

// GetAll fetches all shipments
func (r *ShipmentRepository) GetAll(ctx context.Context) ([]models.Shipment, error) {
    query := `
        SELECT 
            s.id,
            s.tracking_number,
            s.customer_name,
            s.origin_port_id,
            s.destination_port_id,
            s.vessel_id,
            s.description,
            s.container_number,
            s.weight_kg,
            s.status,
            COALESCE(s.manifest_items, '[]'::jsonb) as manifest_items,
            s.eta,
            s.created_at,
            s.updated_at,
            origin.name AS origin_port_name,
            dest.name AS destination_port_name
        FROM shipments s
        LEFT JOIN ports origin ON s.origin_port_id = origin.id
        LEFT JOIN ports dest ON s.destination_port_id = dest.id
        ORDER BY s.created_at DESC
    `

    rows, err := r.db.GetPool().Query(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("failed to query shipments: %w", err)
    }
    defer rows.Close()

    var shipments []models.Shipment
    for rows.Next() {
        var s models.Shipment
        err := rows.Scan(
            &s.ID,
            &s.TrackingNumber,
            &s.CustomerName,
            &s.OriginPortID,
            &s.DestinationPortID,
            &s.VesselID,
            &s.Description,
            &s.ContainerNumber,
            &s.WeightKG,
            &s.Status,
            &s.ManifestItems,
            &s.ETA,
            &s.CreatedAt,
            &s.UpdatedAt,
            &s.OriginPortName,      
            &s.DestinationPortName, 
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan shipment: %w", err)
        }
        shipments = append(shipments, s)
    }

    // ✅ FIX: Return empty array instead of nil
    if shipments == nil {
        shipments = []models.Shipment{}
    }

    return shipments, nil
}

// GetByTrackingNumber finds a single shipment with Port names included
func (r *ShipmentRepository) GetByTrackingNumber(ctx context.Context, trackingNum string) (*models.Shipment, error) {
	// We alias ports as 'p1' (Origin) and 'p2' (Destination)
	query := `
		SELECT 
			s.id, s.tracking_number, s.customer_name, 
			s.origin_port_id, s.destination_port_id, 
			s.vessel_id, s.description, s.container_number, 
			s.weight_kg, s.status, 
			COALESCE(s.manifest_items, '[]'::jsonb) as manifest_items,
			s.eta, s.created_at, s.updated_at,
			p1.name as origin_name,
			p2.name as dest_name
		FROM shipments s
		JOIN ports p1 ON s.origin_port_id = p1.id
		JOIN ports p2 ON s.destination_port_id = p2.id
		WHERE s.tracking_number = $1
	`
	var s models.Shipment
	
	// Scan must match the SELECT order exactly
	err := r.db.GetPool().QueryRow(ctx, query, trackingNum).Scan(
		&s.ID, &s.TrackingNumber, &s.CustomerName, 
		&s.OriginPortID, &s.DestinationPortID,
		&s.VesselID, &s.Description, &s.ContainerNumber, 
		&s.WeightKG, &s.Status, &s.ManifestItems, &s.ETA, &s.CreatedAt, &s.UpdatedAt,
		&s.OriginPortName,      // <--- New scan target
		&s.DestinationPortName, // <--- New scan target
	)
	
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// UpdateETAForVessel calculates arrival time based on ship speed and route progress
func (r *ShipmentRepository) UpdateETAForVessel(ctx context.Context, vesselID string, routeID string, progress float64, speedKnots float64) error {
	// Formula: Remaining Distance / Speed = Time Remaining
	// 1 Knot = 0.514444 Meters per Second
	query := `
		WITH route_metric AS (
			-- Get total length of the route in meters
			SELECT ST_Length(path) as total_meters 
			FROM routes WHERE id = $1
		)
		UPDATE shipments
		SET eta = NOW() + make_interval(secs := (
			(SELECT total_meters FROM route_metric) * (1.0 - $2) -- Remaining Meters
			/ 
			GREATEST(($3 * 0.514444), 1.0) -- Speed in m/s (avoid divide by zero)
		))
		WHERE vessel_id = $4 
		AND (status = 'IN_TRANSIT' OR status = 'PENDING')
	`
	_, err := r.db.GetPool().Exec(ctx, query, routeID, progress, speedKnots, vesselID)
	return err
}

func (r *ShipmentRepository) UpdateStatus(ctx context.Context, id string, status string) error {
	query := `UPDATE shipments SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.GetPool().Exec(ctx, query, status, id)
	return err
}

func (r *ShipmentRepository) CreateOrUpdate(ctx context.Context, s *models.Shipment) error {
	query := `
		INSERT INTO shipments (
			tracking_number, customer_name, origin_port_id, destination_port_id, 
			vessel_id, description, container_number, weight_kg, status, manifest_items
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)
		ON CONFLICT (tracking_number) DO UPDATE 
		SET status = EXCLUDED.status, manifest_items = EXCLUDED.manifest_items
		RETURNING id
	`
	err := r.db.GetPool().QueryRow(
		ctx, query,
		s.TrackingNumber, s.CustomerName, s.OriginPortID, s.DestinationPortID,
		s.VesselID, s.Description, s.ContainerNumber, s.WeightKG, s.ManifestItems,
	).Scan(&s.ID)
	return err
}

// GetByVesselID retrieves all shipments for a specific vessel with port names
func (r *ShipmentRepository) GetByVesselID(ctx context.Context, vesselID string) ([]models.Shipment, error) {
    query := `
        SELECT 
            s.id, s.tracking_number, s.customer_name, 
            s.origin_port_id, s.destination_port_id, 
            s.vessel_id, s.description, s.container_number, 
            s.weight_kg, s.status, 
            COALESCE(s.manifest_items, '[]'::jsonb) as manifest_items,
            s.eta, s.created_at, s.updated_at,
            p1.name as origin_name,
            p2.name as dest_name
        FROM shipments s
        JOIN ports p1 ON s.origin_port_id = p1.id
        JOIN ports p2 ON s.destination_port_id = p2.id
        WHERE s.vessel_id = $1
        ORDER BY s.created_at DESC
    `
    
    rows, err := r.db.GetPool().Query(ctx, query, vesselID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var shipments []models.Shipment
    for rows.Next() {
        var s models.Shipment
        err := rows.Scan(
            &s.ID, &s.TrackingNumber, &s.CustomerName,
            &s.OriginPortID, &s.DestinationPortID,
            &s.VesselID, &s.Description, &s.ContainerNumber,
            &s.WeightKG, &s.Status, &s.ManifestItems, &s.ETA, &s.CreatedAt, &s.UpdatedAt,
            &s.OriginPortName,
            &s.DestinationPortName,
        )
        if err != nil {
            return nil, err
        }
        shipments = append(shipments, s)
    }

    // Return empty array instead of nil if no shipments found
    if shipments == nil {
        shipments = []models.Shipment{}
    }

    return shipments, nil
}

// Delete removes a shipment by ID
func (r *ShipmentRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM shipments WHERE id = $1`
	result, err := r.db.GetPool().Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete shipment: %w", err)
	}
	
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("shipment not found")
	}
	
	return nil
}

// Update modifies an existing shipment
func (r *ShipmentRepository) Update(ctx context.Context, s *models.Shipment) error {
	query := `
		UPDATE shipments 
		SET 
			customer_name = $1,
			origin_port_id = $2,
			destination_port_id = $3,
			vessel_id = $4,
			description = $5,
			container_number = $6,
			weight_kg = $7,
			status = $8,
			eta = $9,
			manifest_items = $10,
			updated_at = NOW()
		WHERE id = $11
		RETURNING updated_at
	`
	
	err := r.db.GetPool().QueryRow(
		ctx, query,
		s.CustomerName, s.OriginPortID, s.DestinationPortID,
		s.VesselID, s.Description, s.ContainerNumber, s.WeightKG,
		s.Status, s.ETA, s.ManifestItems, s.ID,
	).Scan(&s.UpdatedAt)
	
	if err != nil {
		return fmt.Errorf("failed to update shipment: %w", err)
	}
	
	return nil
}

// UpdateStatusByVessel updates all shipments on a vessel from one status to another
// Used when vessel changes state (e.g., ANCHORED -> AT_SEA, transitions PENDING -> IN_TRANSIT)
func (r *ShipmentRepository) UpdateStatusByVessel(ctx context.Context, vesselID string, fromStatus string, toStatus string) error {
	query := `
		UPDATE shipments 
		SET status = $1, updated_at = NOW()
		WHERE vessel_id = $2 
		AND status = $3
	`
	
	result, err := r.db.GetPool().Exec(ctx, query, toStatus, vesselID, fromStatus)
	if err != nil {
		return fmt.Errorf("failed to update shipment statuses for vessel: %w", err)
	}
	
	rowsAffected := result.RowsAffected()
	if rowsAffected > 0 {
		fmt.Printf("✅ Updated %d shipment(s) from %s to %s for vessel %s\n", rowsAffected, fromStatus, toStatus, vesselID)
	}
	
	return nil
}