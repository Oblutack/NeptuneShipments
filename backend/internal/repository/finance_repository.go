package repository

import (
	"context"
	"fmt"
	"time"

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

// rateInputs holds the live-data-driven rate card so both GetStats and
// GetDailyRevenue price shipment weight the same way, from one call site.
type rateInputs struct {
	oilPrice        OilPrice
	fxRate          FXRate
	baseFreightRate float64
	bafPercent      float64
	cafPercent      float64
	effectiveRate   float64
}

// computeRateInputs builds today's rate card from live oil price / FX
// data. Base freight rate is still a simulated constant - there's no
// real-world source for what this fictional company charges its
// customers. BAF and CAF on top of it are real surcharge mechanisms
// (every real carrier publishes these), driven by real live data.
func (r *FinanceRepository) computeRateInputs(ctx context.Context) rateInputs {
	const baseFreightRate = 2.00 // $2.00 per kg
	const baselineFuelPricePerTon = 600.0
	const baselineUSDToEUR = 0.92

	oilPrice := r.oilPriceSvc.GetPrice(ctx)
	fxRate := r.fxRateSvc.GetRate(ctx)

	bafPercent := clampPercent(
		(oilPrice.PricePerTonUSD-baselineFuelPricePerTon)/baselineFuelPricePerTon*100, -20, 40,
	)
	cafPercent := clampPercent(
		(fxRate.USDToEUR-baselineUSDToEUR)/baselineUSDToEUR*100*0.5, -5, 10,
	)

	return rateInputs{
		oilPrice:        oilPrice,
		fxRate:          fxRate,
		baseFreightRate: baseFreightRate,
		bafPercent:      bafPercent,
		cafPercent:      cafPercent,
		effectiveRate:   baseFreightRate * (1 + (bafPercent+cafPercent)/100),
	}
}

// GetStats calculates comprehensive financial statistics
func (r *FinanceRepository) GetStats(ctx context.Context) (*models.FinancialStats, error) {
	stats := &models.FinancialStats{}

	rates := r.computeRateInputs(ctx)
	stats.FuelPricePerTon = rates.oilPrice.PricePerTonUSD
	stats.OilRefPriceUSDBbl = rates.oilPrice.PricePerBarrelUSD
	stats.FuelPriceIsLive = rates.oilPrice.IsLive
	stats.FXRateUSDEUR = rates.fxRate.USDToEUR
	stats.FXRateIsLive = rates.fxRate.IsLive
	stats.BaseFreightRate = rates.baseFreightRate
	stats.BAFPercent = rates.bafPercent
	stats.CAFPercent = rates.cafPercent
	stats.EffectiveRate = rates.effectiveRate
	freightRate := rates.effectiveRate

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

	stats.TotalFuelCost = stats.FuelConsumed * rates.oilPrice.PricePerTonUSD

	// 3. Calculate Gross Profit
	stats.GrossProfit = stats.TotalRevenue - stats.TotalFuelCost

	// 4. Calculate Average Revenue Per Job
	if stats.TotalShipments > 0 {
		stats.AvgRevenuePerJob = stats.TotalRevenue / float64(stats.TotalShipments)
	}

	return stats, nil
}

// GetDailyRevenue returns real per-day revenue for the last `days` days,
// computed from actual shipment bookings (weight_kg grouped by the date
// the shipment was created) priced at today's live effective rate - the
// same rate GetStats reports, just split out by day instead of summed.
// Days with no bookings come back as real zeros rather than being
// omitted, so a sparse demo dataset shows the truth instead of a
// smoothed-over curve.
//
// Cost per day is not independently trackable (fuel burn is only kept as
// a fleet-wide running total, not per-shipment-per-day), so it's the
// real fleet-wide fuel cost allocated pro-rata by each day's share of
// total revenue - a real total split by a real ratio, not an invented
// number.
func (r *FinanceRepository) GetDailyRevenue(ctx context.Context, days int) ([]models.DailyRevenuePoint, error) {
	rates := r.computeRateInputs(ctx)

	query := `
        SELECT
            d::date AS day,
            COALESCE(SUM(s.weight_kg), 0) AS total_weight,
            COUNT(s.id) AS shipment_count
        FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day'::interval) AS d
        LEFT JOIN shipments s ON s.created_at::date = d::date
        GROUP BY d
        ORDER BY d
    `

	rows, err := r.db.GetPool().Query(ctx, query, days)
	if err != nil {
		return nil, fmt.Errorf("failed to query daily revenue: %w", err)
	}
	defer rows.Close()

	points := []models.DailyRevenuePoint{}
	var totalWeight, totalRevenue float64
	for rows.Next() {
		var day time.Time
		var weight float64
		var count int
		if err := rows.Scan(&day, &weight, &count); err != nil {
			return nil, fmt.Errorf("failed to scan daily revenue row: %w", err)
		}
		revenue := weight * rates.effectiveRate
		totalWeight += weight
		totalRevenue += revenue
		points = append(points, models.DailyRevenuePoint{
			Date:          day.Format("2006-01-02"),
			Revenue:       revenue,
			ShipmentCount: count,
		})
	}

	// Fleet-wide fuel cost, allocated pro-rata by each day's revenue share.
	var fuelConsumed float64
	if err := r.db.GetPool().QueryRow(ctx, `SELECT COALESCE(SUM(fuel_capacity - fuel_level), 0) FROM vessels`).Scan(&fuelConsumed); err != nil {
		return nil, fmt.Errorf("failed to calculate fuel consumption: %w", err)
	}
	totalFuelCost := fuelConsumed * rates.oilPrice.PricePerTonUSD

	if totalRevenue > 0 {
		for i := range points {
			points[i].Cost = (points[i].Revenue / totalRevenue) * totalFuelCost
		}
	}

	return points, nil
}
