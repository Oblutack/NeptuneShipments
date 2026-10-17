package repository

import (
	"context"
	"fmt"

	"github.com/Oblutack/NeptuneShipments/backend/internal/database"
	"github.com/Oblutack/NeptuneShipments/backend/internal/models"
)

type FinanceRepository struct {
	db          *database.Service
	oilPriceSvc *OilPriceService
	fxRateSvc   *FXRateService
}

func NewFinanceRepository(db *database.Service, oilPriceSvc *OilPriceService, fxRateSvc *FXRateService) *FinanceRepository {
	return &FinanceRepository{db: db, oilPriceSvc: oilPriceSvc, fxRateSvc: fxRateSvc}
}

// clampPercent keeps a surcharge within a realistic band - real BAF/CAF
// tables are published in bands too, not an unbounded raw pass-through
// of market movement.
func clampPercent(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

// GetStats calculates comprehensive financial statistics
func (r *FinanceRepository) GetStats(ctx context.Context) (*models.FinancialStats, error) {
	stats := &models.FinancialStats{}

	// Base freight rate is still a simulated constant - there's no real-
	// world source for what this fictional company charges its
	// customers. BAF and CAF on top of it are real surcharge mechanisms
	// (every real carrier publishes these), driven by real live data.
	const baseFreightRate = 2.00 // $2.00 per kg
	const baselineFuelPricePerTon = 600.0
	const baselineUSDToEUR = 0.92

	oilPrice := r.oilPriceSvc.GetPrice(ctx)
	fuelPricePerTon := oilPrice.PricePerTonUSD
	stats.FuelPricePerTon = fuelPricePerTon
	stats.OilRefPriceUSDBbl = oilPrice.PricePerBarrelUSD
	stats.FuelPriceIsLive = oilPrice.IsLive

	fxRate := r.fxRateSvc.GetRate(ctx)
	stats.FXRateUSDEUR = fxRate.USDToEUR
	stats.FXRateIsLive = fxRate.IsLive

	stats.BaseFreightRate = baseFreightRate
	stats.BAFPercent = clampPercent(
		(fuelPricePerTon-baselineFuelPricePerTon)/baselineFuelPricePerTon*100, -20, 40,
	)
	stats.CAFPercent = clampPercent(
		(fxRate.USDToEUR-baselineUSDToEUR)/baselineUSDToEUR*100*0.5, -5, 10,
	)
	freightRate := baseFreightRate * (1 + (stats.BAFPercent+stats.CAFPercent)/100)
	stats.EffectiveRate = freightRate

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
