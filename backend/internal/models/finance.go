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
}
