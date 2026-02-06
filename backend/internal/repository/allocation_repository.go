package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type AllocationRepository struct {
    db *database.Service
}

func NewAllocationRepository(db *database.Service) *AllocationRepository {
    return &AllocationRepository{db: db}
}

// GetByPortID retrieves all allocations for terminals within a specific port
// GetByPortID retrieves all allocations for terminals within a specific port
func (r *AllocationRepository) GetByPortID(ctx context.Context, portID string, startDate, endDate time.Time) ([]models.BerthAllocation, error) {
    query := `
        SELECT 
            ba.id, ba.vessel_id, ba.berth_id, ba.start_time, ba.end_time, 
            ba.status, ba.notes, ba.created_at, ba.updated_at,
            v.name as vessel_name,
            b.name as berth_name
        FROM berth_allocations ba
        JOIN berths b ON ba.berth_id = b.id
        JOIN terminals t ON b.terminal_id = t.id
        JOIN vessels v ON ba.vessel_id = v.id
        WHERE t.port_id = $1
          AND ba.end_time >= $2
          AND ba.start_time <= $3
          AND ba.status IN ('SCHEDULED', 'ACTIVE')
        ORDER BY ba.start_time ASC
    `

    rows, err := r.db.GetPool().Query(ctx, query, portID, startDate, endDate)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch allocations: %w", err)
    }
    defer rows.Close()

    var allocations []models.BerthAllocation
    for rows.Next() {
        var a models.BerthAllocation
        var notes sql.NullString // ✅ Handle NULL notes

        err := rows.Scan(
            &a.ID, &a.VesselID, &a.BerthID, &a.StartTime, &a.EndTime,
            &a.Status, &notes, &a.CreatedAt, &a.UpdatedAt,
            &a.VesselName, &a.BerthName,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan allocation: %w", err)
        }

        if notes.Valid {
            a.Notes = notes.String
        }

        allocations = append(allocations, a)
    }

    return allocations, nil
}

// CheckOverlap validates if a time slot is available for a berth
func (r *AllocationRepository) CheckOverlap(ctx context.Context, berthID string, startTime, endTime time.Time) (*models.AllocationConflict, error) {
    query := `
        SELECT 
            ba.id, v.name, ba.start_time, ba.end_time
        FROM berth_allocations ba
        JOIN vessels v ON ba.vessel_id = v.id
        WHERE ba.berth_id = $1
          AND ba.status IN ('SCHEDULED', 'ACTIVE')
          AND (
            (ba.start_time <= $2 AND ba.end_time > $2) OR  -- Overlaps start
            (ba.start_time < $3 AND ba.end_time >= $3) OR  -- Overlaps end
            (ba.start_time >= $2 AND ba.end_time <= $3)    -- Fully contained
          )
        LIMIT 1
    `

    var conflict models.AllocationConflict
    var conflictID, vesselName string
    var overlapStart, overlapEnd time.Time

    err := r.db.GetPool().QueryRow(ctx, query, berthID, startTime, endTime).
        Scan(&conflictID, &vesselName, &overlapStart, &overlapEnd)

    if err != nil {
        // No conflict found (expected error)
        if err.Error() == "no rows in result set" {
            return nil, nil
        }
        return nil, fmt.Errorf("failed to check overlap: %w", err)
    }

    // Conflict found
    conflict.ConflictingAllocationID = conflictID
    conflict.ConflictingVesselName = vesselName
    conflict.OverlapStart = overlapStart
    conflict.OverlapEnd = overlapEnd

    return &conflict, nil
}

// Create inserts a new berth allocation and updates vessel status
func (r *AllocationRepository) Create(ctx context.Context, allocation *models.BerthAllocation) error {
    // First check for conflicts
    conflict, err := r.CheckOverlap(ctx, allocation.BerthID, allocation.StartTime, allocation.EndTime)
    if err != nil {
        return fmt.Errorf("overlap check failed: %w", err)
    }

    if conflict != nil {
        return fmt.Errorf("berth is already allocated to vessel '%s' during this time period", conflict.ConflictingVesselName)
    }

    // Start transaction
    tx, err := r.db.GetPool().Begin(ctx)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer tx.Rollback(ctx)

    // Insert allocation
    query := `
        INSERT INTO berth_allocations (vessel_id, berth_id, start_time, end_time, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at, updated_at
    `

    err = tx.QueryRow(
        ctx, query,
        allocation.VesselID,
        allocation.BerthID,
        allocation.StartTime,
        allocation.EndTime,
        allocation.Status,
        allocation.Notes,
    ).Scan(&allocation.ID, &allocation.CreatedAt, &allocation.UpdatedAt)

    if err != nil {
        return fmt.Errorf("failed to create allocation: %w", err)
    }

    // ✅ Update vessel status to DOCKED
    updateVesselQuery := `UPDATE vessels SET status = 'DOCKED' WHERE id = $1`
    _, err = tx.Exec(ctx, updateVesselQuery, allocation.VesselID)
    if err != nil {
        return fmt.Errorf("failed to update vessel status: %w", err)
    }

    // Commit transaction
    if err := tx.Commit(ctx); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
    }

    return nil
}

// UpdateStatus changes the allocation status (e.g., SCHEDULED -> ACTIVE -> COMPLETED)
func (r *AllocationRepository) UpdateStatus(ctx context.Context, allocationID, status string) error {
    query := `UPDATE berth_allocations SET status = $1 WHERE id = $2`
    _, err := r.db.GetPool().Exec(ctx, query, status, allocationID)
    return err
}

// GetUnassignedVessels returns vessels that need berth assignments
func (r *AllocationRepository) GetUnassignedVessels(ctx context.Context) ([]models.Vessel, error) {
    query := `
        SELECT 
            v.id, v.name, v.imo_number, v.type, v.status,
            ST_Y(v.location::geometry) as lat,
            ST_X(v.location::geometry) as lon,
            v.heading, v.speed_knots, v.fuel_level, v.fuel_capacity
        FROM vessels v
        LEFT JOIN berth_allocations ba ON v.id = ba.vessel_id 
            AND ba.status IN ('SCHEDULED', 'ACTIVE')
            AND ba.end_time > NOW()  -- ✅ Only check future allocations
        WHERE ba.id IS NULL  -- ✅ Vessel has no active/future allocations
        ORDER BY v.name ASC
    `

    rows, err := r.db.GetPool().Query(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch unassigned vessels: %w", err)
    }
    defer rows.Close()

    var vessels []models.Vessel
    for rows.Next() {
        var v models.Vessel
        err := rows.Scan(
            &v.ID, &v.Name, &v.IMONumber, &v.Type, &v.Status,
            &v.Latitude, &v.Longitude, &v.Heading, &v.SpeedKnots,
            &v.FuelLevel, &v.FuelCapacity,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan vessel: %w", err)
        }
        vessels = append(vessels, v)
    }

    return vessels, nil
}

// GetScheduledAllocationByVesselID returns a SCHEDULED allocation for a vessel
func (r *AllocationRepository) GetScheduledAllocationByVesselID(ctx context.Context, vesselID string) (*models.BerthAllocation, error) {
    query := `
        SELECT 
            ba.id, ba.vessel_id, ba.berth_id, ba.start_time, ba.end_time, 
            ba.status, ba.notes, ba.created_at, ba.updated_at,
            v.name as vessel_name,
            b.name as berth_name
        FROM berth_allocations ba
        JOIN berths b ON ba.berth_id = b.id
        JOIN vessels v ON ba.vessel_id = v.id
        WHERE ba.vessel_id = $1
          AND ba.status = 'SCHEDULED'
        ORDER BY ba.start_time ASC
        LIMIT 1
    `

    var a models.BerthAllocation
    var notes sql.NullString

    err := r.db.GetPool().QueryRow(ctx, query, vesselID).Scan(
        &a.ID, &a.VesselID, &a.BerthID, &a.StartTime, &a.EndTime,
        &a.Status, &notes, &a.CreatedAt, &a.UpdatedAt,
        &a.VesselName, &a.BerthName,
    )

    if err != nil {
        if err.Error() == "no rows in result set" {
            return nil, nil // No scheduled allocation found
        }
        return nil, fmt.Errorf("failed to fetch scheduled allocation: %w", err)
    }

    if notes.Valid {
        a.Notes = notes.String
    }

    return &a, nil
}

// GetBerthPortID returns the port ID for a given berth
func (r *AllocationRepository) GetBerthPortID(ctx context.Context, berthID string) (string, error) {
    query := `
        SELECT t.port_id 
        FROM berths b
        JOIN terminals t ON b.terminal_id = t.id
        WHERE b.id = $1
    `
    
    var portID string
    err := r.db.GetPool().QueryRow(ctx, query, berthID).Scan(&portID)
    if err != nil {
        return "", fmt.Errorf("failed to get berth's port: %w", err)
    }
    
    return portID, nil
}

