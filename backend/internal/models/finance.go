package models

// FinancialStats represents the company's financial overview
type FinancialStats struct {
	TotalRevenue   float64 `json:"total_revenue"`
	TotalFuelCost  float64 `json:"total_fuel_cost"`
	GrossProfit    float64 `json:"gross_profit"`
	ActiveJobCount int     `json:"active_job_count"`

	// Additional useful metrics
	TotalShipments    int     `json:"total_shipments"`
	CompletedJobCount int     `json:"completed_job_count"`
	FuelConsumed      float64 `json:"fuel_consumed"`
	AvgRevenuePerJob  float64 `json:"avg_revenue_per_job"`

	// Fuel cost is priced using a real, live WTI crude oil quote where
	// available (see OilPriceService) - these fields let the frontend be
	// honest about whether that's live data or the offline fallback.
	FuelPricePerTon   float64 `json:"fuel_price_per_ton"`
	OilRefPriceUSDBbl float64 `json:"oil_ref_price_usd_bbl"`
	FuelPriceIsLive   bool    `json:"fuel_price_is_live"`

	// Freight rate structure: real shipping carriers quote a base rate
	// plus surcharges, not one flat number. BAF (Bunker Adjustment
	// Factor) and CAF (Currency Adjustment Factor) are both derived from
	// real live market data (oil price / USD-EUR rate) rather than fixed
	// constants.
	BaseFreightRate float64 `json:"base_freight_rate"`
	BAFPercent      float64 `json:"baf_percent"`
	CAFPercent      float64 `json:"caf_percent"`
	EffectiveRate   float64 `json:"effective_rate"`
	FXRateUSDEUR    float64 `json:"fx_rate_usd_eur"`
	FXRateIsLive    bool    `json:"fx_rate_is_live"`
}

// DailyRevenuePoint is one day of the revenue trend: real shipment
// weight booked that day, priced at today's live effective rate (the
// same rate GetStats uses) - not a per-day historical rate, since the
// system doesn't keep a rate history. Days with no bookings are
// included with zero values so the series has no gaps.
type DailyRevenuePoint struct {
	Date          string  `json:"date"`
	Revenue       float64 `json:"revenue"`
	Cost          float64 `json:"cost"`
	ShipmentCount int     `json:"shipment_count"`
}
