package models

import (
	"encoding/json"
	"time"
)

type Route struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Path        json.RawMessage `json:"path"` // The GeoJSON LineString
	CreatedAt   time.Time       `json:"created_at"`
}