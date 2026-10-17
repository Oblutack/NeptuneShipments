package models

import "time"

type ShipmentEvent struct {
	ID          string    `json:"id"`
	ShipmentID  string    `json:"shipment_id"`
	EventType   string    `json:"event_type"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}
