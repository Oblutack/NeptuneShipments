package repository

import (
	"context"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type ShipmentEventRepository struct {
	db *database.Service
}

func NewShipmentEventRepository(db *database.Service) *ShipmentEventRepository {
	return &ShipmentEventRepository{db: db}
}

func (r *ShipmentEventRepository) Create(ctx context.Context, shipmentID, eventType, description string) error {
	_, err := r.db.GetPool().Exec(ctx,
		`INSERT INTO shipment_events (shipment_id, event_type, description) VALUES ($1, $2, $3)`,
		shipmentID, eventType, description,
	)
	if err != nil {
		return fmt.Errorf("failed to create shipment event: %w", err)
	}
	return nil
}

// CreateForShipments logs the same event type/description for a batch of
// shipments at once - used when a single vessel-level transition (e.g. a
// vessel departing port) affects every shipment currently loaded on it.
// A failure here is logged by the caller, not propagated, since it must
// never roll back the actual status change that already happened.
func (r *ShipmentEventRepository) CreateForShipments(ctx context.Context, shipmentIDs []string, eventType, description string) error {
	for _, id := range shipmentIDs {
		if err := r.Create(ctx, id, eventType, description); err != nil {
			return err
		}
	}
	return nil
}

func (r *ShipmentEventRepository) GetByShipmentID(ctx context.Context, shipmentID string) ([]models.ShipmentEvent, error) {
	rows, err := r.db.GetPool().Query(ctx,
		`SELECT id, shipment_id, event_type, description, created_at
         FROM shipment_events WHERE shipment_id = $1 ORDER BY created_at ASC`,
		shipmentID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch shipment events: %w", err)
	}
	defer rows.Close()

	events := []models.ShipmentEvent{}
	for rows.Next() {
		var e models.ShipmentEvent
		if err := rows.Scan(&e.ID, &e.ShipmentID, &e.EventType, &e.Description, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan shipment event: %w", err)
		}
		events = append(events, e)
	}
	return events, nil
}
