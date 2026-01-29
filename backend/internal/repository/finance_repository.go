package repository

import (
	"context"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type FinanceRepository struct {
    db *database.Service
}

func NewFinanceRepository(db *database.Service) *FinanceRepository {
    return &FinanceRepository{db: db}
}

// GetStats calculates comprehensive financial statistics
func (r *FinanceRepository) GetStats(ctx context.Context) (*models.FinancialStats, error) {
    stats := &models.FinancialStats{}

    // Constants
    const freightRate = 2.50  // $2.50 per kg
    const fuelPricePerTon = 600.0 // $600 per ton of bunker fuel

    // 1. Calculate Revenue (Sum of all shipment weights * freight rate)
    revenueQuery := `
        SELECT 
            COALESCE(SUM(weight_kg), 0) as total_weight,
            COUNT(*) as total_shipments,
            COUNT(CASE WHEN status = 'IN_TRANSIT' THEN 1 END) as active_jobs,
            COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as completed_jobs
        FROM shipments
    `

    var totalWeight float64
    err := r.db.GetPool().QueryRow(ctx, revenueQuery).Scan(
        &totalWeight,
        &stats.TotalShipments,
        &stats.ActiveJobCount,
        &stats.CompletedJobCount,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to calculate revenue: %w", err)
    }

    stats.TotalRevenue = totalWeight * freightRate

    // 2. Calculate Fuel Consumption (capacity - current level for all vessels)
    fuelQuery := `
        SELECT 
            COALESCE(SUM(fuel_capacity - fuel_level), 0) as fuel_consumed
        FROM vessels
    `

    err = r.db.GetPool().QueryRow(ctx, fuelQuery).Scan(&stats.FuelConsumed)
    if err != nil {
        return nil, fmt.Errorf("failed to calculate fuel consumption: %w", err)
    }

    stats.TotalFuelCost = stats.FuelConsumed * fuelPricePerTon

    // 3. Calculate Gross Profit
    stats.GrossProfit = stats.TotalRevenue - stats.TotalFuelCost

    // 4. Calculate Average Revenue Per Job
    if stats.TotalShipments > 0 {
        stats.AvgRevenuePerJob = stats.TotalRevenue / float64(stats.TotalShipments)
    }

    return stats, nil
}