package models

import "time"

const (
	AlertLevelCritical = "CRITICAL"
	AlertLevelInfo     = "INFO"

	// Conditions: stay open until the vessel recovers.
	AlertKindOutOfFuel        = "OUT_OF_FUEL"
	AlertKindMechanicalFailed = "MECHANICAL_FAILURE"

	// Events: recorded already resolved.
	AlertKindArrived   = "ARRIVED"
	AlertKindRecovered = "RECOVERED"
)

// Alert is a persisted notification about a vessel. Acknowledged means an
// operator has seen it; Resolved means the underlying condition has ended
// (always true for INFO events).
type Alert struct {
	ID             string     `json:"id"`
	VesselID       *string    `json:"vessel_id"`
	VesselName     string     `json:"vessel_name"`
	Level          string     `json:"level"`
	Kind           string     `json:"kind"`
	Message        string     `json:"message"`
	CreatedAt      time.Time  `json:"created_at"`
	AcknowledgedBy *string    `json:"acknowledged_by"`
	AcknowledgedAt *time.Time `json:"acknowledged_at"`
	ResolvedAt     *time.Time `json:"resolved_at"`
}
