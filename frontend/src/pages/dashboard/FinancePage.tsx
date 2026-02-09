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

export const FinancePage = () => {
  const { data: stats, isLoading } = useGetFinancialStatsQuery(undefined, {
    pollingInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-green-400" size={32} />
          <span className="text-slate-300 font-medium">
            Loading financial data...
          </span>
        </div>
      </div>
    );
  }

  // Mock trend data for charts (7 days)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* ✨ Modern Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg shadow-green-500/20">
            <Receipt className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Financial Overview
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Revenue, costs, and profitability metrics
            </p>
          </div>
        </div>

        {/* Top Row: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Revenue */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-green-500/10 hover:border-green-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/20">
                <DollarSign size={24} className="text-white" />
              </div>
              <span className="text-xs font-bold text-green-400 bg-green-900/30 px-3 py-1.5 rounded-xl border border-green-500/30 flex items-center gap-1">
                <TrendingUp size={12} /> +{profitMargin}%
              </span>
            </div>
            <p className="text-sm text-slate-400 font-medium mb-2">
              Total Revenue
            </p>
            <p className="text-4xl font-bold text-white">
              ${(stats?.total_revenue || 0).toLocaleString()}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-xs">
              <span className="text-slate-500">Avg per shipment</span>
              <span className="text-green-400 font-bold">
                ${(stats?.avg_revenue_per_job || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Fuel Costs */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-red-500/10 hover:border-red-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg shadow-red-500/20">
                <Fuel size={24} className="text-white" />
              </div>
              <span className="text-xs text-red-400 bg-red-900/30 px-3 py-1.5 rounded-xl border border-red-500/30 font-bold">
                Operating Cost
              </span>
            </div>
            <p className="text-sm text-slate-400 font-medium mb-2">
              Total Fuel Costs
            </p>
            <p className="text-4xl font-bold text-white">
              ${(stats?.total_fuel_cost || 0).toLocaleString()}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-xs">
              <span className="text-slate-500">Fuel consumed</span>
              <span className="text-red-400 font-bold">
                {(stats?.fuel_consumed || 0).toFixed(1)} tons
              </span>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/20">
                <TrendingUp size={24} className="text-white" />
              </div>
              <span className="text-xs text-blue-400 bg-blue-900/30 px-3 py-1.5 rounded-xl border border-blue-500/30 font-bold">
                Margin: {profitMargin}%
              </span>
            </div>
            <p className="text-sm text-slate-400 font-medium mb-2">
              Gross Profit
            </p>
            <p className="text-4xl font-bold text-white">
              ${(stats?.gross_profit || 0).toLocaleString()}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-xs">
              <span className="text-slate-500">Profit margin</span>
              <span className="text-blue-400 font-bold">{profitMargin}%</span>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Active Jobs"
            value={stats?.active_job_count || 0}
            icon={<Package size={18} />}
            color="yellow"
          />
          <MetricCard
            label="Completed Jobs"
            value={stats?.completed_job_count || 0}
            icon={<CheckCircle size={18} />}
            color="green"
          />
          <MetricCard
            label="Total Shipments"
            value={stats?.total_shipments || 0}
            icon={<Package size={18} />}
            color="blue"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue vs Costs Bar Chart */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <BarChart3 className="text-purple-400" size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Revenue vs Operating Costs
                </h3>
              </div>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                  <Bar dataKey="costs" fill="#ef4444" name="Costs" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit Trend Line Chart */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <TrendingUp className="text-cyan-400" size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Profit Trend (7 Days)
                </h3>
              </div>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
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
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", r: 4 }}
                    name="Gross Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Financial Summary Table */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-slate-800 px-6 py-4">
            <h3 className="text-xl font-bold text-white">Financial Summary</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
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
    </div>
  );
};

// Metric Card Component
const MetricCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "yellow" | "green" | "blue";
}) => {
  const colorClasses = {
    yellow: "bg-yellow-900/20 border-yellow-500/50 hover:border-yellow-500/70",
    green: "bg-green-900/20 border-green-500/50 hover:border-green-500/70",
    blue: "bg-blue-900/20 border-blue-500/50 hover:border-blue-500/70",
  };

  const iconClasses = {
    yellow: "text-yellow-400",
    green: "text-green-400",
    blue: "text-blue-400",
  };

  return (
    <div
      className={`${colorClasses[color]} border rounded-xl p-4 flex items-center justify-between backdrop-blur-xl transition-all hover:shadow-lg`}
    >
      <div>
        <p className="text-xs uppercase tracking-wider mb-1 text-slate-400 font-medium">
          {label}
        </p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
      <div className={iconClasses[color]}>{icon}</div>
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
  let valueClass = "text-slate-300";
  if (positive) valueClass = "text-green-400 font-bold";
  if (negative) valueClass = "text-red-400 font-bold";
  if (highlight) valueClass = "text-blue-400 font-bold text-xl";

  return (
    <div
      className={`flex justify-between items-center py-3 ${
        highlight
          ? "border-t-2 border-blue-500/50 pt-4"
          : "border-b border-slate-800"
      }`}
    >
      <span className="text-slate-400">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
};
