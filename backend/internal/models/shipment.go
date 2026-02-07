package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// ManifestItem represents a single item in the cargo manifest
type ManifestItem struct {
	SKU         string  `json:"sku"`
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	UnitValue   float64 `json:"unit_value"`
	TotalValue  float64 `json:"total_value"`
}

// ManifestItems is a custom type for JSONB array handling
type ManifestItems []ManifestItem

// Scan implements sql.Scanner for reading from database
func (m *ManifestItems) Scan(value interface{}) error {
	if value == nil {
		*m = ManifestItems{}
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("failed to unmarshal JSONB value: %v", value)
	}
	
	return json.Unmarshal(bytes, m)
}

// Value implements driver.Valuer for writing to database
func (m ManifestItems) Value() (driver.Value, error) {
	if m == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(m)
}

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
	
	ManifestItems   ManifestItems `json:"manifest_items"`
	
	ETA             *time.Time `json:"eta,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	OriginPortName      string `json:"origin_port_name,omitempty"`
	DestinationPortName string `json:"destination_port_name,omitempty"`
}