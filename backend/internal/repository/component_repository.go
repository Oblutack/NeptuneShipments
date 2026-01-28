package repository

import (
	"context"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ComponentRepository struct {
    db *pgxpool.Pool
}

func NewComponentRepository(db *pgxpool.Pool) *ComponentRepository {
    return &ComponentRepository{db: db}
}

// GetByVesselID retrieves all components for a specific vessel
func (r *ComponentRepository) GetByVesselID(ctx context.Context, vesselID string) ([]models.Component, error) {
    query := `
        SELECT 
            id, vessel_id, name, type, health_percentage, status,
            total_operating_hours, last_maintenance, created_at, updated_at
        FROM components
        WHERE vessel_id = $1
        ORDER BY 
            CASE 
                WHEN status = 'CRITICAL' THEN 1
                WHEN status = 'WARNING' THEN 2
                ELSE 3
            END,
            health_percentage ASC
    `

    rows, err := r.db.Query(ctx, query, vesselID)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch components: %w", err)
    }
    defer rows.Close()

    var components []models.Component
    for rows.Next() {
        var c models.Component
        err := rows.Scan(
            &c.ID,
            &c.VesselID,
            &c.Name,
            &c.Type,
            &c.HealthPercentage,
            &c.Status,
            &c.TotalOperatingHours,
            &c.LastMaintenance,
            &c.CreatedAt,
            &c.UpdatedAt,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan component: %w", err)
        }
        components = append(components, c)
    }

    // Return empty array instead of nil
    if components == nil {
        components = []models.Component{}
    }

    return components, nil
}

// MaintainComponent performs maintenance, restoring component to full health
func (r *ComponentRepository) MaintainComponent(ctx context.Context, componentID string) error {
    query := `
        UPDATE components
        SET 
            health_percentage = 100.0,
            status = 'OPERATIONAL',
            last_maintenance = NOW(),
            updated_at = NOW()
        WHERE id = $1
    `

    result, err := r.db.Exec(ctx, query, componentID)
    if err != nil {
        return fmt.Errorf("failed to maintain component: %w", err)
    }

    rowsAffected := result.RowsAffected()
    if rowsAffected == 0 {
        return fmt.Errorf("component not found")
    }

    return nil
}

// GetByID retrieves a single component (optional helper)
func (r *ComponentRepository) GetByID(ctx context.Context, id string) (*models.Component, error) {
    query := `
        SELECT 
            id, vessel_id, name, type, health_percentage, status,
            total_operating_hours, last_maintenance, created_at, updated_at
        FROM components
        WHERE id = $1
    `

    var c models.Component
    err := r.db.QueryRow(ctx, query, id).Scan(
        &c.ID,
        &c.VesselID,
        &c.Name,
        &c.Type,
        &c.HealthPercentage,
        &c.Status,
        &c.TotalOperatingHours,
        &c.LastMaintenance,
        &c.CreatedAt,
        &c.UpdatedAt,
    )

    if err != nil {
        return nil, fmt.Errorf("component not found: %w", err)
    }

    return &c, nil
}

func (r *ComponentRepository) DegradeComponents(ctx context.Context, vesselID string, amount float64) error {
    query := `
        UPDATE components
        SET 
            health_percentage = GREATEST(0, health_percentage - $2),
            total_operating_hours = total_operating_hours + 5.0,
            status = CASE
                WHEN health_percentage - $2 <= 10 THEN 'CRITICAL'
                WHEN health_percentage - $2 <= 50 THEN 'WARNING'
                ELSE 'OPERATIONAL'
            END,
            updated_at = NOW()
        WHERE vessel_id = $1
    `

    _, err := r.db.Exec(ctx, query, vesselID, amount)
    if err != nil {
        return fmt.Errorf("failed to degrade components: %w", err)
    }

    return nil
}

// CheckCriticalFailure determines if any component is below critical threshold
func (r *ComponentRepository) CheckCriticalFailure(ctx context.Context, vesselID string) (bool, error) {
    query := `
        SELECT COUNT(*)
        FROM components
        WHERE vessel_id = $1 AND health_percentage <= 10.0
    `

    var count int
    err := r.db.QueryRow(ctx, query, vesselID).Scan(&count)
    if err != nil {
        return false, fmt.Errorf("failed to check critical failure: %w", err)
    }

    return count > 0, nil
}