package repository

import (
	"context"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type PortRepository struct {
    db *database.Service
}

func NewPortRepository(db *database.Service) *PortRepository {
    return &PortRepository{db: db}
}

func (r *PortRepository) GetAll(ctx context.Context) ([]models.Port, error) {
    query := `
        SELECT id, un_locode, name, country, 
               ST_Y(location::geometry) as lat, 
               ST_X(location::geometry) as lon, 
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