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

	// IMDGClass is the UN Dangerous Goods class (1-9, per the IMO's real
	// International Maritime Dangerous Goods code) if this item is
	// classified as dangerous goods. Empty/omitted for ordinary cargo.
	IMDGClass string `json:"imdg_class,omitempty"`
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
	ID                string `json:"id"`
	TrackingNumber    string `json:"tracking_number"`
	CustomerName      string `json:"customer_name"`
	OriginPortID      string `json:"origin_port_id"`
	DestinationPortID string `json:"destination_port_id"`

	// Nullable because a shipment might sit at a port waiting for a ship
	VesselID *string `json:"vessel_id,omitempty"`

	// CustomerUserID links a shipment to the CLIENT user who booked it -
	// the client portal's GetAllForCustomer filters on this. Set by the
	// handler from the requester's own JWT for a CLIENT booking (never
	// trusted from the request body), left nil for an ADMIN-created
	// shipment with no associated self-service account.
	CustomerUserID *string `json:"customer_user_id,omitempty"`

	Description     string  `json:"description"`
	ContainerNumber string  `json:"container_number"`
	WeightKG        float64 `json:"weight_kg"`
	Status          string  `json:"status"` // PENDING, IN_TRANSIT, etc.

	ManifestItems ManifestItems `json:"manifest_items"`

	ETA                 *time.Time `json:"eta,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	OriginPortName      string     `json:"origin_port_name,omitempty"`
	DestinationPortName string     `json:"destination_port_name,omitempty"`
}

// PublicShipmentView is what the unauthenticated tracking endpoint
// returns: enough to follow a shipment (status, route, ETA, which vessel
// to show on the map) and nothing about who booked it or what is in it.
// The full Shipment carries the customer's name and account id and every
// manifest line with its value and dangerous-goods class, none of which
// should be readable by anyone who can guess a tracking number.
type PublicShipmentView struct {
	TrackingNumber      string     `json:"tracking_number"`
	Status              string     `json:"status"`
	OriginPortName      string     `json:"origin_port_name"`
	DestinationPortName string     `json:"destination_port_name"`
	ETA                 *time.Time `json:"eta,omitempty"`
	VesselID            *string    `json:"vessel_id,omitempty"`
	WeightKG            float64    `json:"weight_kg"`
	ContainerNumber     string     `json:"container_number"`
	CreatedAt           time.Time  `json:"created_at"`
}

// PublicView projects a Shipment down to its publicly shareable fields.
func (s *Shipment) PublicView() PublicShipmentView {
	return PublicShipmentView{
		TrackingNumber:      s.TrackingNumber,
		Status:              s.Status,
		OriginPortName:      s.OriginPortName,
		DestinationPortName: s.DestinationPortName,
		ETA:                 s.ETA,
		VesselID:            s.VesselID,
		WeightKG:            s.WeightKG,
		ContainerNumber:     s.ContainerNumber,
		CreatedAt:           s.CreatedAt,
	}
}
