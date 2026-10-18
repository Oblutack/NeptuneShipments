package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// ErrAlertNotFound is returned when an alert id matches nothing (including
// a malformed id, which can't match anything either).
var ErrAlertNotFound = errors.New("alert not found")

type AlertRepository struct {
	db *database.Service
}

func NewAlertRepository(db *database.Service) *AlertRepository {
	return &AlertRepository{db: db}
}

type CreateAlertParams struct {
	VesselID   string
	VesselName string
	Level      string
	Kind       string
	Message    string
}

const alertColumns = `id, vessel_id, vessel_name, level, kind, message, created_at,
	acknowledged_by, acknowledged_at, resolved_at`

func scanAlert(row pgx.Row) (*models.Alert, error) {
	var a models.Alert
	if err := row.Scan(&a.ID, &a.VesselID, &a.VesselName, &a.Level, &a.Kind, &a.Message, &a.CreatedAt,
		&a.AcknowledgedBy, &a.AcknowledgedAt, &a.ResolvedAt); err != nil {
		return nil, err
	}
	return &a, nil
}

// Create records an alert and returns it, or (nil, nil) if it was
// suppressed as a duplicate: a CRITICAL condition that already has an open
// alert for the same vessel and kind. INFO events are stored already
// resolved, so they are never duplicates of each other.
func (r *AlertRepository) Create(ctx context.Context, p CreateAlertParams) (*models.Alert, error) {
	query := `
		INSERT INTO alerts (vessel_id, vessel_name, level, kind, message, resolved_at)
		VALUES ($1, $2, $3, $4, $5, CASE WHEN $6::boolean THEN NOW() END)
		ON CONFLICT DO NOTHING
		RETURNING ` + alertColumns
	a, err := scanAlert(r.db.GetPool().QueryRow(ctx, query,
		p.VesselID, p.VesselName, p.Level, p.Kind, p.Message, p.Level == models.AlertLevelInfo))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return a, err
}

// List returns alerts newest first, with unresolved CRITICAL conditions
// ahead of everything else. onlyUnacknowledged limits it to alerts nobody
// has acknowledged yet - the ones still needing attention.
func (r *AlertRepository) List(ctx context.Context, onlyUnacknowledged bool, limit int) ([]models.Alert, error) {
	query := `
		SELECT ` + alertColumns + `
		FROM alerts
		WHERE ($1 = FALSE OR acknowledged_at IS NULL)
		ORDER BY (level = 'CRITICAL' AND resolved_at IS NULL) DESC, created_at DESC
		LIMIT $2`
	rows, err := r.db.GetPool().Query(ctx, query, onlyUnacknowledged, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list alerts: %w", err)
	}
	defer rows.Close()

	alerts := []models.Alert{}
	for rows.Next() {
		a, err := scanAlert(rows)
		if err != nil {
			return nil, err
		}
		alerts = append(alerts, *a)
	}
	return alerts, rows.Err()
}

// Acknowledge marks an alert as seen by userID. Acknowledging twice is
// harmless and keeps the first acknowledgement. userID may be empty.
func (r *AlertRepository) Acknowledge(ctx context.Context, id, userID string) (*models.Alert, error) {
	var by *string
	if userID != "" {
		by = &userID
	}
	query := `
		UPDATE alerts
		SET acknowledged_by = COALESCE(acknowledged_by, $2),
		    acknowledged_at = COALESCE(acknowledged_at, NOW())
		WHERE id = $1
		RETURNING ` + alertColumns
	a, err := scanAlert(r.db.GetPool().QueryRow(ctx, query, id, by))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrAlertNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "22P02" { // invalid_text_representation: not a UUID
		return nil, ErrAlertNotFound
	}
	return a, err
}

// ResolveForRecoveredVessels closes every open CRITICAL condition whose
// vessel is no longer in DISTRESS (or no longer exists), so the same fault
// can be raised again if it recurs. Returns how many it closed.
//
// This works from the vessel's state rather than from a "recovered" event
// because there are several ways out of DISTRESS - the engine's own
// recovery, a refuel, a new route assignment, maintenance, an admin edit -
// and only some of them pass through the engine.
func (r *AlertRepository) ResolveForRecoveredVessels(ctx context.Context) (int, error) {
	tag, err := r.db.GetPool().Exec(ctx, `
		UPDATE alerts SET resolved_at = NOW()
		WHERE resolved_at IS NULL AND level = 'CRITICAL'
		  AND (vessel_id IS NULL
		       OR vessel_id IN (SELECT id FROM vessels WHERE status <> 'DISTRESS'))`)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}
