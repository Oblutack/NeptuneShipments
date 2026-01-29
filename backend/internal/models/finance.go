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
}