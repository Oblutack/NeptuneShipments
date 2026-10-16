package models

import "time"

type AuditLogEntry struct {
	ID         string                 `json:"id"`
	ActorID    *string                `json:"actor_id"`
	ActorEmail string                 `json:"actor_email"`
	Action     string                 `json:"action"`
	EntityType string                 `json:"entity_type"`
	EntityID   *string                `json:"entity_id"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt  time.Time              `json:"created_at"`
}
