package models

import "time"

type Shipment struct {
	ID              string    `json:"id"`
	TrackingNumber  string    `json:"tracking_number"`
	CustomerName    string    `json:"customer_name"`
	OriginPortID    string    `json:"origin_port_id"`
	DestinationPortID string  `json:"destination_port_id"`
	
	// Nullable because a shipment might sit at a port waiting for a ship
	VesselID        *string   `json:"vessel_id,omitempty"` 
	
	Description     string    `json:"description"`
	ContainerNumber string    `json:"container_number"`
	WeightKG        float64   `json:"weight_kg"`
	Status          string    `json:"status"` // PENDING, IN_TRANSIT, etc.
	
	ETA             *time.Time `json:"eta,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	OriginPortName      string `json:"origin_port_name,omitempty"`
	DestinationPortName string `json:"destination_port_name,omitempty"`
}