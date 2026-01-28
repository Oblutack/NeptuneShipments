package repository

import (
	"context"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type CrewRepository struct {
    db *database.Service
}

func NewCrewRepository(db *database.Service) *CrewRepository {
    return &CrewRepository{db: db}
}

// GetAll retrieves all crew members with their assigned vessel names
func (r *CrewRepository) GetAll(ctx context.Context) ([]models.CrewMember, error) {
    query := `
        SELECT 
            c.id, c.name, c.role, c.license_number, c.nationality, 
            c.vessel_id, c.status, c.created_at, c.updated_at,
            v.name as vessel_name
        FROM crew c
        LEFT JOIN vessels v ON c.vessel_id = v.id
        ORDER BY 
            CASE c.role
                WHEN 'CAPTAIN' THEN 1
                WHEN 'CHIEF_ENGINEER' THEN 2
                WHEN 'FIRST_OFFICER' THEN 3
                ELSE 4
            END,
            c.name ASC
    `

    rows, err := r.db.GetPool().Query(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch crew: %w", err)
    }
    defer rows.Close()

    var crew []models.CrewMember
    for rows.Next() {
        var c models.CrewMember
        var vesselName *string

        err := rows.Scan(
            &c.ID,
            &c.Name,
            &c.Role,
            &c.LicenseNumber,
            &c.Nationality,
            &c.VesselID,
            &c.Status,
            &c.CreatedAt,
            &c.UpdatedAt,
            &vesselName,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan crew member: %w", err)
        }

        // Handle nullable vessel name
        if vesselName != nil {
            c.VesselName = *vesselName
        } else {
            c.VesselName = "Unassigned"
        }

        crew = append(crew, c)
    }

    // Return empty array instead of nil
    if crew == nil {
        crew = []models.CrewMember{}
    }

    return crew, nil
}

// GetByVesselID retrieves all crew members assigned to a specific vessel
func (r *CrewRepository) GetByVesselID(ctx context.Context, vesselID string) ([]models.CrewMember, error) {
    query := `
        SELECT 
            c.id, c.name, c.role, c.license_number, c.nationality, 
            c.vessel_id, c.status, c.created_at, c.updated_at,
            v.name as vessel_name
        FROM crew c
        LEFT JOIN vessels v ON c.vessel_id = v.id
        WHERE c.vessel_id = $1
        ORDER BY 
            CASE c.role
                WHEN 'CAPTAIN' THEN 1
                WHEN 'CHIEF_ENGINEER' THEN 2
                WHEN 'FIRST_OFFICER' THEN 3
                ELSE 4
            END,
            c.name ASC
    `

    rows, err := r.db.GetPool().Query(ctx, query, vesselID)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch crew by vessel: %w", err)
    }
    defer rows.Close()

    var crew []models.CrewMember
    for rows.Next() {
        var c models.CrewMember
        var vesselName *string

        err := rows.Scan(
            &c.ID,
            &c.Name,
            &c.Role,
            &c.LicenseNumber,
            &c.Nationality,
            &c.VesselID,
            &c.Status,
            &c.CreatedAt,
            &c.UpdatedAt,
            &vesselName,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan crew member: %w", err)
        }

        if vesselName != nil {
            c.VesselName = *vesselName
        }

        crew = append(crew, c)
    }

    if crew == nil {
        crew = []models.CrewMember{}
    }

    return crew, nil
}

// AssignToVessel assigns a crew member to a vessel
func (r *CrewRepository) AssignToVessel(ctx context.Context, crewID string, vesselID string) error {
    query := `
        UPDATE crew
        SET vessel_id = $2, updated_at = NOW()
        WHERE id = $1
    `

    result, err := r.db.GetPool().Exec(ctx, query, crewID, vesselID)
    if err != nil {
        return fmt.Errorf("failed to assign crew to vessel: %w", err)
    }

    if result.RowsAffected() == 0 {
        return fmt.Errorf("crew member not found")
    }

    return nil
}

// CreateOrUpdate inserts or updates a crew member (for CSV import)
func (r *CrewRepository) CreateOrUpdate(ctx context.Context, crew *models.CrewMember) error {
    query := `
        INSERT INTO crew (name, role, license_number, nationality, vessel_id, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        ON CONFLICT (license_number) 
        DO UPDATE SET 
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            nationality = EXCLUDED.nationality,
            vessel_id = EXCLUDED.vessel_id,
            updated_at = NOW()
        RETURNING id, created_at, updated_at
    `

    err := r.db.GetPool().QueryRow(
        ctx,
        query,
        crew.Name,
        crew.Role,
        crew.LicenseNumber,
        crew.Nationality,
        crew.VesselID,
    ).Scan(&crew.ID, &crew.CreatedAt, &crew.UpdatedAt)

    if err != nil {
        return fmt.Errorf("failed to create or update crew member: %w", err)
    }

    return nil
}