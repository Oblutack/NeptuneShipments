package models

import (
	"time"
)

type Vessel struct {
	ID              string    `json:"id"` // UUID from DB
	Name            string    `json:"name"`
	IMONumber       string    `json:"imo_number"`
	FlagCountry     string    `json:"flag_country"`
	Type            string    `json:"type"`   // TANKER, CONTAINER, etc.
	Status          string    `json:"status"` // AT_SEA, DOCKED, etc.
	
	// Nullable fields need pointers (*int) so they can be nil in JSON
	CapacityTEU     *int      `json:"capacity_teu,omitempty"`
	CapacityBarrels *float64  `json:"capacity_barrels,omitempty"`
	
	// These are helpers. In DB they are one 'location' column.
	Latitude        float64   `json:"latitude"`
	Longitude       float64   `json:"longitude"`
	
	Heading         float64   `json:"heading"`
	SpeedKnots      float64   `json:"speed_knots"`
	
	LastUpdated     time.Time `json:"last_updated"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	CurrentRouteID *string  `json:"current_route_id" db:"current_route_id"`
    RouteProgress  float64  `json:"route_progress" db:"route_progress"`

	FuelLevel      float64   `json:"fuel_level" db:"fuel_level"`
    FuelCapacity   float64   `json:"fuel_capacity" db:"fuel_capacity"`
}