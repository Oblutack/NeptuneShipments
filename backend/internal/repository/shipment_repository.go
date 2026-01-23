package repository

import (
	"context"

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
			vessel_id, description, container_number, weight_kg, status, eta
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at, updated_at
	`
	
	// Default status if empty
	if s.Status == "" {
		s.Status = "PENDING"
	}

	err := r.db.GetPool().QueryRow(
		ctx, query,
		s.TrackingNumber, s.CustomerName, s.OriginPortID, s.DestinationPortID,
		s.VesselID, s.Description, s.ContainerNumber, s.WeightKG, s.Status, s.ETA,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)

	return err
}

// GetAll fetches all shipments
func (r *ShipmentRepository) GetAll(ctx context.Context) ([]models.Shipment, error) {
	query := `
		SELECT id, tracking_number, customer_name, origin_port_id, destination_port_id, 
		       vessel_id, description, container_number, weight_kg, status, eta, created_at, updated_at
		FROM shipments
	`
	rows, err := r.db.GetPool().Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shipments []models.Shipment
	for rows.Next() {
		var s models.Shipment
		err := rows.Scan(
			&s.ID, &s.TrackingNumber, &s.CustomerName, &s.OriginPortID, &s.DestinationPortID,
			&s.VesselID, &s.Description, &s.ContainerNumber, &s.WeightKG, &s.Status, &s.ETA, &s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		shipments = append(shipments, s)
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
			s.weight_kg, s.status, s.eta, s.created_at, s.updated_at,
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
		&s.WeightKG, &s.Status, &s.ETA, &s.CreatedAt, &s.UpdatedAt,
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
			vessel_id, description, container_number, weight_kg, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
		ON CONFLICT (tracking_number) DO UPDATE 
		SET status = EXCLUDED.status -- Just touch it to ensure it exists
		RETURNING id
	`
	err := r.db.GetPool().QueryRow(
		ctx, query,
		s.TrackingNumber, s.CustomerName, s.OriginPortID, s.DestinationPortID,
		s.VesselID, s.Description, s.ContainerNumber, s.WeightKG,
	).Scan(&s.ID)
	return err
}