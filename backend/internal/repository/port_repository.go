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