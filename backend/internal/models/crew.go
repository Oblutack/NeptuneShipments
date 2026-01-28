package models

import "time"

// CrewMember represents a person working on a vessel
type CrewMember struct {
    ID          string    `json:"id" db:"id"`
    Name        string    `json:"name" db:"name"`
    Role        string    `json:"role" db:"role"` // CAPTAIN, CHIEF_ENGINEER, FIRST_OFFICER, DECKHAND, COOK
    License     string    `json:"license" db:"license"`
    Nationality string    `json:"nationality" db:"nationality"`
    VesselID    *string   `json:"vessel_id,omitempty" db:"vessel_id"` // Nullable - crew might be unassigned
    Status      string    `json:"status" db:"status"` // ACTIVE, ON_LEAVE, RETIRED
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`

    // Joined fields (from vessel table)
    VesselName string `json:"vessel_name,omitempty" db:"vessel_name"` // Populated via LEFT JOIN
}