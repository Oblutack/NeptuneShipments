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

// GetByTrackingNumber finds a single shipment
func (r *ShipmentRepository) GetByTrackingNumber(ctx context.Context, trackingNum string) (*models.Shipment, error) {
	query := `
		SELECT id, tracking_number, customer_name, origin_port_id, destination_port_id, 
		       vessel_id, description, container_number, weight_kg, status, eta, created_at, updated_at
		FROM shipments
		WHERE tracking_number = $1
	`
	var s models.Shipment
	err := r.db.GetPool().QueryRow(ctx, query, trackingNum).Scan(
		&s.ID, &s.TrackingNumber, &s.CustomerName, &s.OriginPortID, &s.DestinationPortID,
		&s.VesselID, &s.Description, &s.ContainerNumber, &s.WeightKG, &s.Status, &s.ETA, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}