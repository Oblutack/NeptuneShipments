package models

import "time"

// Component represents a ship system or part that can degrade
type Component struct {
    ID                   string    `json:"id" db:"id"`
    VesselID             string    `json:"vessel_id" db:"vessel_id"`
    Name                 string    `json:"name" db:"name"`
    Type                 string    `json:"type" db:"type"` // PROPULSION, ELECTRICAL, NAVIGATION, HULL
    HealthPercentage     float64   `json:"health_percentage" db:"health_percentage"`
    Status               string    `json:"status" db:"status"` // OPERATIONAL, WARNING, CRITICAL
    TotalOperatingHours  float64   `json:"total_operating_hours" db:"total_operating_hours"`
    LastMaintenance      time.Time `json:"last_maintenance" db:"last_maintenance"`
    CreatedAt            time.Time `json:"created_at" db:"created_at"`
    UpdatedAt            time.Time `json:"updated_at" db:"updated_at"`
}