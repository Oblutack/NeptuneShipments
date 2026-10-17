import { useGetFinancialStatsQuery } from "../../features/api/apiSlice";
import {
  DollarSign,
  Fuel,
  TrendingUp,
  Loader2,
  Package,
  CheckCircle,
  BarChart3,
  Receipt,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageHeader } from "../../components/ui/PageHeader";

export const FinancePage = () => {
  const { data: stats, isLoading } = useGetFinancialStatsQuery(undefined, {
    pollingInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-400" size={28} />
          <span className="text-slate-400 font-medium">
            Loading financial data...
          </span>
        </div>
      </div>
    );
  }

  // Mock trend data for charts (7 days) - last point blends in today's real stats
  const trendData = [
    { day: "Mon", revenue: 45000, costs: 18000, profit: 27000 },
    { day: "Tue", revenue: 52000, costs: 21000, profit: 31000 },
    { day: "Wed", revenue: 48000, costs: 19500, profit: 28500 },
    { day: "Thu", revenue: 61000, costs: 24000, profit: 37000 },
    { day: "Fri", revenue: 58000, costs: 23000, profit: 35000 },
    { day: "Sat", revenue: 67000, costs: 26000, profit: 41000 },
    {
      day: "Sun",
      revenue: stats?.total_revenue || 75000,
      costs: stats?.total_fuel_cost || 28000,
      profit: stats?.gross_profit || 47000,
    },
  ];

  const profitMargin = stats?.total_revenue
    ? ((stats.gross_profit / stats.total_revenue) * 100).toFixed(1)
    : "0";

  return (
    <>
      <PageHeader
        icon={Receipt}
        title="Financial Overview"
        subtitle="Revenue, costs, and profitability metrics"
      />

      <div className="space-y-4">
        {/* Top Row: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Revenue */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={16} className="text-slate-500" />
              <span className="text-slate-400 text-sm font-medium">
                Total Revenue
              </span>
            </div>
            <p className="text-2xl font-semibold text-white tabular-nums">
              ${(stats?.total_revenue || 0).toLocaleString()}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-xs">
              <span className="text-slate-500">Avg per shipment</span>
              <span className="text-slate-300 tabular-nums">
                ${(stats?.avg_revenue_per_job || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Fuel Costs */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Fuel size={16} className="text-slate-500" />
              <span className="text-slate-400 text-sm font-medium">
                Total Fuel Costs
              </span>
            </div>
            <p className="text-2xl font-semibold text-white tabular-nums">
              ${(stats?.total_fuel_cost || 0).toLocaleString()}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Fuel consumed</span>
                <span className="text-slate-300 tabular-nums">
                  {(stats?.fuel_consumed || 0).toFixed(1)} tons
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  Price/ton
                  {stats?.fuel_price_is_live ? (
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded font-medium">
                      LIVE
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded font-medium">
                      OFFLINE FALLBACK
                    </span>
                  )}
                </span>
                <span className="text-slate-300 tabular-nums">
                  ${(stats?.fuel_price_per_ton || 0).toFixed(0)}
                </span>
              </div>
              {stats?.fuel_price_is_live && (
                <p className="text-[10px] text-slate-600">
                  Indexed to real WTI crude (${stats.oil_ref_price_usd_bbl.toFixed(2)}/bbl) via
                  barrels-per-ton - an honest proxy, not the actual bunker fuel index.
                </p>
              )}
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-slate-500" />
              <span className="text-slate-400 text-sm font-medium">
                Gross Profit
              </span>
            </div>
            <p className="text-2xl font-semibold text-white tabular-nums">
              ${(stats?.gross_profit || 0).toLocaleString()}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-xs">
              <span className="text-slate-500">Profit margin</span>
              <span className="text-emerald-400 tabular-nums">
                {profitMargin}%
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Active Jobs"
            value={stats?.active_job_count || 0}
            icon={<Package size={16} />}
          />
          <MetricCard
            label="Completed Jobs"
            value={stats?.completed_job_count || 0}
            icon={<CheckCircle size={16} />}
          />
          <MetricCard
            label="Total Shipments"
            value={stats?.total_shipments || 0}
            icon={<Package size={16} />}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue vs Costs Bar Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-slate-500" size={16} />
                <h3 className="text-sm font-semibold text-white">
                  Revenue vs Operating Costs
                </h3>
                <span className="text-[10px] text-slate-600 font-medium bg-slate-800 px-1.5 py-0.5 rounded">
                  SIMULATED
                </span>
              </div>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                  <Bar dataKey="costs" fill="#ef4444" name="Costs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit Trend Line Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-slate-500" size={16} />
                <h3 className="text-sm font-semibold text-white">
                  Profit Trend (7 Days)
                </h3>
                <span className="text-[10px] text-slate-600 font-medium bg-slate-800 px-1.5 py-0.5 rounded">
                  SIMULATED
                </span>
              </div>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                    name="Gross Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Financial Summary Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-white">
              Financial Summary
            </h3>
          </div>
          <div className="p-5">
            <div className="space-y-0.5">
              <SummaryRow
                label="Total Revenue"
                value={`$${(stats?.total_revenue || 0).toLocaleString()}`}
                positive
              />
              <SummaryRow
                label="Operating Costs (Fuel)"
                value={`-$${(stats?.total_fuel_cost || 0).toLocaleString()}`}
                negative
              />
              <SummaryRow
                label="Gross Profit"
                value={`$${(stats?.gross_profit || 0).toLocaleString()}`}
                highlight
              />
              <SummaryRow label="Profit Margin" value={`${profitMargin}%`} />
              <SummaryRow
                label="Average Revenue per Shipment"
                value={`$${(stats?.avg_revenue_per_job || 0).toLocaleString()}`}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Metric Card Component
const MetricCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">
          {label}
        </p>
        <p className="text-xl font-semibold text-white tabular-nums">
          {value}
        </p>
      </div>
      <div className="text-slate-500">{icon}</div>
    </div>
  );
};

// Summary Row Component
const SummaryRow = ({
  label,
  value,
  positive,
  negative,
  highlight,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  highlight?: boolean;
}) => {
  let valueClass = "text-slate-300 tabular-nums";
  if (positive) valueClass = "text-emerald-400 font-medium tabular-nums";
  if (negative) valueClass = "text-red-400 font-medium tabular-nums";
  if (highlight)
    valueClass = "text-blue-400 font-semibold text-lg tabular-nums";

  return (
    <div
      className={`flex justify-between items-center py-2.5 ${
        highlight
          ? "border-t border-slate-800 mt-1 pt-3.5"
          : "border-b border-slate-800"
      }`}
    >
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
};
