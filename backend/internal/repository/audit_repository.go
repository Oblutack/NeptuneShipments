package repository

import (
	"context"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type AuditRepository struct {
	db *database.Service
}

func NewAuditRepository(db *database.Service) *AuditRepository {
	return &AuditRepository{db: db}
}

type CreateAuditEntryParams struct {
	ActorID    *string
	ActorEmail string
	Action     string
	EntityType string
	EntityID   *string
	Metadata   map[string]interface{}
}

func (r *AuditRepository) Create(ctx context.Context, params CreateAuditEntryParams) error {
	query := `
        INSERT INTO audit_log (actor_id, actor_email, action, entity_type, entity_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
    `
	_, err := r.db.GetPool().Exec(ctx, query,
		params.ActorID,
		params.ActorEmail,
		params.Action,
		params.EntityType,
		params.EntityID,
		params.Metadata,
	)
	if err != nil {
		return fmt.Errorf("failed to write audit log entry: %w", err)
	}
	return nil
}

func (r *AuditRepository) List(ctx context.Context, limit, offset int) ([]models.AuditLogEntry, error) {
	query := `
        SELECT id, actor_id, actor_email, action, entity_type, entity_id, metadata, created_at
        FROM audit_log
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `
	rows, err := r.db.GetPool().Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch audit log: %w", err)
	}
	defer rows.Close()

	entries := []models.AuditLogEntry{}
	for rows.Next() {
		var e models.AuditLogEntry
		if err := rows.Scan(
			&e.ID, &e.ActorID, &e.ActorEmail, &e.Action, &e.EntityType, &e.EntityID, &e.Metadata, &e.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan audit log entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, nil
}
