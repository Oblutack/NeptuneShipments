package models

import (
	"encoding/json"
	"time"
)

type Route struct {
	ID                string          `json:"id"`
	Name              string          `json:"name"`
	OriginPortID      string          `json:"origin_port_id"`
	DestinationPortID string          `json:"destination_port_id"`
	Path              json.RawMessage `json:"path"` // The GeoJSON LineString
	CreatedAt         time.Time       `json:"created_at"`
}