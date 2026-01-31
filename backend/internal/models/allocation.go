package models

import "time"

// BerthAllocation represents a scheduled docking reservation
type BerthAllocation struct {
    ID        string    `json:"id" db:"id"`
    VesselID  string    `json:"vessel_id" db:"vessel_id"`
    BerthID   string    `json:"berth_id" db:"berth_id"`
    StartTime time.Time `json:"start_time" db:"start_time"`
    EndTime   time.Time `json:"end_time" db:"end_time"`
    Status    string    `json:"status" db:"status"` // SCHEDULED, ACTIVE, COMPLETED, CANCELLED
    Notes     string    `json:"notes" db:"notes"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`

    // Populated by joins
    VesselName string `json:"vessel_name,omitempty"`
    BerthName  string `json:"berth_name,omitempty"`
}

// AllocationConflict represents an overlapping booking error
type AllocationConflict struct {
    ConflictingAllocationID string
    ConflictingVesselName   string
    OverlapStart            time.Time
    OverlapEnd              time.Time
}