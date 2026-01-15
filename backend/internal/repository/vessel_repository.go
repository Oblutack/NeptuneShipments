package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VesselRepository struct {
    db *pgxpool.Pool
}

func NewVesselRepository(db *pgxpool.Pool) *VesselRepository {
    return &VesselRepository{
        db: db,
    }
}

func (r *VesselRepository) Create(ctx context.Context, vessel *models.Vessel) error {
    query := `
        INSERT INTO vessels (
            name,
            imo_number,
            flag_country,
            type,
            status,
            capacity_teu,
            capacity_barrels,
            location,
            heading,
            speed_knots,
            last_updated,
            created_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            ST_SetSRID(ST_MakePoint($8, $9), 4326),
            $10, $11, $12, $13
        )
        RETURNING id, created_at, last_updated
    `

    now := time.Now()
    if vessel.CreatedAt.IsZero() {
        vessel.CreatedAt = now
    }
    if vessel.LastUpdated.IsZero() {
        vessel.LastUpdated = now
    }

    err := r.db.QueryRow(
        ctx,
        query,
        vessel.Name,
        vessel.IMONumber,
        vessel.FlagCountry,
        vessel.Type,
        vessel.Status,
        vessel.CapacityTEU,
        vessel.CapacityBarrels,
        vessel.Longitude, 
        vessel.Latitude,
        vessel.Heading,
        vessel.SpeedKnots,
        vessel.LastUpdated,
        vessel.CreatedAt,
    ).Scan(&vessel.ID, &vessel.CreatedAt, &vessel.LastUpdated)

    if err != nil {
        return fmt.Errorf("failed to create vessel: %w", err)
    }

    return nil
}

// GetAll vessels
func (r *VesselRepository) GetAll(ctx context.Context) ([]models.Vessel, error) {
    // Note: ST_X is Longitude, ST_Y is Latitude
    query := `
        SELECT 
            id, name, imo_number, flag_country, type, status, 
            capacity_teu, capacity_barrels,
            ST_Y(location::geometry) as latitude,
            ST_X(location::geometry) as longitude,
            heading, speed_knots, last_updated, created_at
        FROM vessels
    `

    rows, err := r.db.Query(ctx, query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var vessels []models.Vessel
    for rows.Next() {
        var v models.Vessel
        err := rows.Scan(
            &v.ID, &v.Name, &v.IMONumber, &v.FlagCountry, &v.Type, &v.Status,
            &v.CapacityTEU, &v.CapacityBarrels,
            &v.Latitude, &v.Longitude,
            &v.Heading, &v.SpeedKnots, &v.LastUpdated, &v.CreatedAt,
        )
        if err != nil {
            return nil, err
        }
        vessels = append(vessels, v)
    }
    return vessels, nil
}