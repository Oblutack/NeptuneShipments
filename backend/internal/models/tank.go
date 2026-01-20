package models

import "time"

type Tank struct {
	ID              string    `json:"id" db:"id"`
	VesselID        string    `json:"vessel_id" db:"vessel_id"`
	Name            string    `json:"name" db:"name"`
	CapacityBarrels float64   `json:"capacity_barrels" db:"capacity_barrels"`
	CurrentLevel    float64   `json:"current_level" db:"current_level"`
	CargoType       string    `json:"cargo_type" db:"cargo_type"`
	TemperatureC    float64   `json:"temperature_c" db:"temperature_c"`
	IsFilling       bool      `json:"is_filling" db:"is_filling"`
	IsDraining      bool      `json:"is_draining" db:"is_draining"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}