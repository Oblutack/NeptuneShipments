package models

import "time"

// Terminal represents a cargo handling facility within a port
type Terminal struct {
    ID        string    `json:"id" db:"id"`
    PortID    string    `json:"port_id" db:"port_id"`
    Name      string    `json:"name" db:"name"`
    Type      string    `json:"type" db:"type"` // CONTAINER, LIQUID, BULK, etc.
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    
    // Nested berths (populated by repository)
    Berths []Berth `json:"berths"`
}

// Berth represents a docking position within a terminal
type Berth struct {
    ID              string  `json:"id" db:"id"`
    TerminalID      string  `json:"terminal_id" db:"terminal_id"`
    Name            string  `json:"name" db:"name"`
    LengthMeters    float64 `json:"length_meters" db:"length_meters"`
    IsOccupied      bool    `json:"is_occupied" db:"is_occupied"`
    CurrentVesselID *string `json:"current_vessel_id,omitempty" db:"current_vessel_id"` // Nullable
    CreatedAt       time.Time `json:"created_at" db:"created_at"`
}