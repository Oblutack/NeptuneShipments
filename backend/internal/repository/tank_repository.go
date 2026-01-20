package repository

import (
	"context"
	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type TankRepository struct {
	db *database.Service
}

func NewTankRepository(db *database.Service) *TankRepository {
	return &TankRepository{db: db}
}

func (r *TankRepository) GetByVesselID(ctx context.Context, vesselID string) ([]models.Tank, error) {
	query := `
		SELECT id, vessel_id, name, capacity_barrels, current_level, 
		       cargo_type, temperature_c, is_filling, is_draining
		FROM tanks
		WHERE vessel_id = $1
		ORDER BY name ASC
	`
	rows, err := r.db.GetPool().Query(ctx, query, vesselID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tanks []models.Tank
	for rows.Next() {
		var t models.Tank
		if err := rows.Scan(
			&t.ID, &t.VesselID, &t.Name, &t.CapacityBarrels, &t.CurrentLevel,
			&t.CargoType, &t.TemperatureC, &t.IsFilling, &t.IsDraining,
		); err != nil {
			return nil, err
		}
		tanks = append(tanks, t)
	}
	return tanks, nil
}