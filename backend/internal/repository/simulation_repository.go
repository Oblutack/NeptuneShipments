package repository

import (
	"context"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
)

type SimulationRepository struct {
	db *database.Service
}

func NewSimulationRepository(db *database.Service) *SimulationRepository {
	return &SimulationRepository{db: db}
}

// Reset clears active-voyage state - shipments, routes, berth
// allocations and alerts - and returns every vessel to an idle,
// fully-fueled DOCKED state. It deliberately does NOT touch ports, crew, users, or
// the pgRouting ocean network: those are reference/infrastructure data,
// not simulation state, and wiping them would mean re-running the
// seeder's CSV import, not a one-click admin action.
//
// Runs as a single transaction so a mid-reset failure can't leave the
// fleet half-reset (e.g. routes cleared but vessels still pointing at
// a now-deleted route id).
func (r *SimulationRepository) Reset(ctx context.Context) error {
	tx, err := r.db.GetPool().Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to start reset transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Allocations reference vessels (ON DELETE CASCADE), but a stale
	// berth allocation for a voyage that's about to stop existing would
	// be confusing leftover data, so clear it explicitly rather than
	// relying on a cascade that only fires if the vessel row itself is
	// deleted (it isn't - vessels are reset in place, not removed).
	if _, err := tx.Exec(ctx, `DELETE FROM berth_allocations`); err != nil {
		return fmt.Errorf("failed to clear berth allocations: %w", err)
	}

	// Alerts describe the state being reset (a stranded vessel, a recent
	// arrival); left behind they would be stale cards about ships that are
	// now docked and full. The audit log keeps the permanent record.
	if _, err := tx.Exec(ctx, `DELETE FROM alerts`); err != nil {
		return fmt.Errorf("failed to clear alerts: %w", err)
	}

	// Cascades to shipment_events automatically (ON DELETE CASCADE).
	if _, err := tx.Exec(ctx, `DELETE FROM shipments`); err != nil {
		return fmt.Errorf("failed to clear shipments: %w", err)
	}

	// Vessels must stop referencing routes before routes can be deleted
	// - vessels.current_route_id has no ON DELETE action.
	if _, err := tx.Exec(ctx, `
		UPDATE vessels SET
			status = 'DOCKED',
			current_route_id = NULL,
			route_progress = 0,
			speed_knots = 0,
			heading = 0,
			fuel_level = fuel_capacity,
			total_fuel_consumed_tons = 0,
			total_distance_nm = 0
	`); err != nil {
		return fmt.Errorf("failed to reset vessels: %w", err)
	}

	if _, err := tx.Exec(ctx, `DELETE FROM routes`); err != nil {
		return fmt.Errorf("failed to clear routes: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit reset transaction: %w", err)
	}
	return nil
}
