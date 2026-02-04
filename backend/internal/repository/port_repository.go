package repository

import (
	"context"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type PortRepository struct {
    db *database.Service
}

func NewPortRepository(db *database.Service) *PortRepository {
    return &PortRepository{db: db}
}

// PortStat represents port statistics with docked vessel count
type PortStat struct {
    ID        string  `json:"id"`
    Name      string  `json:"name"`
    Locode    string  `json:"locode"`
    Latitude  float64 `json:"latitude"`
    Longitude float64 `json:"longitude"`
    ShipCount int     `json:"ship_count"`
}

func (r *PortRepository) Create(ctx context.Context, port *models.Port) error {
    query := `
        INSERT INTO ports (name, locode, country, type, location)
        VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
        RETURNING id, created_at, updated_at
    `

    err := r.db.GetPool().QueryRow(
        ctx, query,
        port.Name, port.UnLocode, port.Country, port.Type,
        port.Longitude, port.Latitude,
    ).Scan(&port.ID, &port.CreatedAt, &port.UpdatedAt)

    if err != nil {
        return fmt.Errorf("failed to create port: %w", err)
    }

    return nil
}

// ✅ NEW: Update updates all fields of an existing port
func (r *PortRepository) Update(ctx context.Context, port *models.Port) error {
    query := `
        UPDATE ports 
        SET 
            name = $1,
            locode = $2,
            country = $3,
            type = $4,
            location = ST_SetSRID(ST_MakePoint($5, $6), 4326),
            updated_at = NOW()
        WHERE id = $7
        RETURNING updated_at
    `

    err := r.db.GetPool().QueryRow(
        ctx, query,
        port.Name, port.UnLocode, port.Country, port.Type,
        port.Longitude, port.Latitude,
        port.ID,
    ).Scan(&port.UpdatedAt)

    if err != nil {
        return fmt.Errorf("failed to update port: %w", err)
    }

    return nil
}

// ✅ NEW: Delete removes a port by ID
// NOTE: This checks for dependencies before deletion
func (r *PortRepository) Delete(ctx context.Context, id string) error {
    // Check for dependencies
    var terminalCount, routeCount int

    // Check terminals
    err := r.db.GetPool().QueryRow(ctx,
        `SELECT COUNT(*) FROM terminals WHERE port_id = $1`,
        id,
    ).Scan(&terminalCount)
    if err != nil {
        return fmt.Errorf("failed to check terminals: %w", err)
    }

    // Check routes
    err = r.db.GetPool().QueryRow(ctx,
        `SELECT COUNT(*) FROM routes WHERE origin_port_id = $1 OR destination_port_id = $1`,
        id,
    ).Scan(&routeCount)
    if err != nil {
        return fmt.Errorf("failed to check routes: %w", err)
    }

    // Return error if port has dependencies
    if terminalCount > 0 || routeCount > 0 {
        return fmt.Errorf(
            "cannot delete port: has %d terminals and %d routes. Please remove them first",
            terminalCount, routeCount,
        )
    }

    // Proceed with deletion
    query := `DELETE FROM ports WHERE id = $1`
    result, err := r.db.GetPool().Exec(ctx, query, id)
    if err != nil {
        return fmt.Errorf("failed to delete port: %w", err)
    }

    if result.RowsAffected() == 0 {
        return fmt.Errorf("port not found")
    }

    return nil
}

// BulkCreate inserts multiple ports in a transaction
func (r *PortRepository) BulkCreate(ctx context.Context, ports []models.Port) error {
    tx, err := r.db.GetPool().Begin(ctx)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer tx.Rollback(ctx)

    query := `
        INSERT INTO ports (name, locode, country, type, location)
        VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
    `

    for _, port := range ports {
        _, err := tx.Exec(
            ctx, query,
            port.Name, port.UnLocode, port.Country, port.Type,
            port.Longitude, port.Latitude,
        )
        if err != nil {
            return fmt.Errorf("failed to insert port %s: %w", port.Name, err)
        }
    }

    if err := tx.Commit(ctx); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
    }

    return nil
}

// GetPortStats retrieves all ports with count of docked vessels within 10km
func (r *PortRepository) GetPortStats(ctx context.Context) ([]PortStat, error) {
    query := `
        SELECT 
            p.id,
            p.name,
            p.un_locode as locode,
            ST_Y(p.location::geometry) as latitude,
            ST_X(p.location::geometry) as longitude,
            COUNT(v.id) FILTER (WHERE v.status = 'DOCKED') as ship_count
        FROM ports p
        LEFT JOIN vessels v ON ST_DWithin(v.location, p.location, 10000)
        GROUP BY p.id, p.name, p.un_locode, p.location
        ORDER BY ship_count DESC, p.name ASC
    `

    rows, err := r.db.GetPool().Query(ctx, query)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch port stats: %w", err)
    }
    defer rows.Close()

    var stats []PortStat
    for rows.Next() {
        var stat PortStat
        err := rows.Scan(
            &stat.ID,
            &stat.Name,
            &stat.Locode,
            &stat.Latitude,
            &stat.Longitude,
            &stat.ShipCount,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan port stat: %w", err)
        }
        stats = append(stats, stat)
    }

    if stats == nil {
        stats = []PortStat{}
    }

    return stats, nil
}

func (r *PortRepository) GetAll(ctx context.Context) ([]models.Port, error) {
    query := `
        SELECT id, un_locode, name, country, 
               ST_Y(location::geometry) as lat, 
               ST_X(location::geometry) as lon,
               type 
               created_at
        FROM ports
    `
    rows, err := r.db.GetPool().Query(ctx, query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var ports []models.Port
    for rows.Next() {
        var p models.Port
        if err := rows.Scan(&p.ID, &p.UnLocode, &p.Name, &p.Country, &p.Latitude, &p.Longitude, &p.CreatedAt); err != nil {
            return nil, err
        }
        ports = append(ports, p)
    }
    return ports, nil
}

// GetByID finds a port by UUID
func (r *PortRepository) GetByID(ctx context.Context, id string) (*models.Port, error) {
	query := `SELECT id, un_locode, name, country, ST_Y(location::geometry), ST_X(location::geometry) FROM ports WHERE id = $1`
	var p models.Port
	err := r.db.GetPool().QueryRow(ctx, query, id).Scan(&p.ID, &p.UnLocode, &p.Name, &p.Country, &p.Latitude, &p.Longitude)
	return &p, err
}

func (r *PortRepository) CreateOrUpdate(ctx context.Context, name, locode, country string, lat, lon float64) error {
	query := `
		INSERT INTO ports (name, un_locode, country, location)
		VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326))
		ON CONFLICT (un_locode) DO UPDATE 
		SET name = EXCLUDED.name, location = EXCLUDED.location
	`
	_, err := r.db.GetPool().Exec(ctx, query, name, locode, country, lat, lon)
	return err
}

func (r *PortRepository) GetIDByLocode(ctx context.Context, locode string) (string, error) {
	var id string
	err := r.db.GetPool().QueryRow(ctx, "SELECT id FROM ports WHERE un_locode = $1", locode).Scan(&id)
	return id, err
}