import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import { useGetRevenueTrendQuery } from "../api/apiSlice";

const formatDay = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export const RevenueChart = () => {
  const [days, setDays] = useState(7);
  const { data: points } = useGetRevenueTrendQuery(days);

  const revenueData = (points || []).map((p) => ({
    day: formatDay(p.date),
    revenue: p.revenue,
    shipments: p.shipment_count,
  }));

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const avgDailyRevenue = revenueData.length
    ? totalRevenue / revenueData.length
    : 0;
  const firstHalf = revenueData.slice(0, Math.ceil(revenueData.length / 2));
  const secondHalf = revenueData.slice(Math.ceil(revenueData.length / 2));
  const firstSum = firstHalf.reduce((s, d) => s + d.revenue, 0);
  const secondSum = secondHalf.reduce((s, d) => s + d.revenue, 0);
  const growthRate = firstSum > 0 ? ((secondSum - firstSum) / firstSum) * 100 : null;
  const hasActivity = totalRevenue > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-slate-500" size={16} />
            <h3 className="text-sm font-semibold text-white">
              Revenue Trend
            </h3>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      <div className="p-5">
        {/* Stats Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs text-slate-500">Last {days} days</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold text-white tabular-nums">
              ${totalRevenue.toLocaleString()}
            </div>
            {growthRate !== null && (
              <div
                className={`flex items-center gap-1 text-xs mt-1 ${growthRate >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                <TrendingUp size={12} />
                {growthRate >= 0 ? "+" : ""}
                {growthRate.toFixed(1)}% vs first half
              </div>
            )}
          </div>
        </div>

        {!hasActivity ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="text-slate-700 mb-3" size={32} />
            <p className="text-sm text-slate-500">
              No shipments booked in the last {days} days
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={revenueData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={20}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "#3b82f6",
                  strokeWidth: 1,
                  strokeDasharray: "5 5",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorRevenue)"
                animationDuration={1000}
              />
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Footer Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800">
          <div>
            <p className="text-xs text-slate-500 mb-1">Avg Daily</p>
            <p className="text-base font-semibold text-white tabular-nums">
              $
              {avgDailyRevenue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Peak Day</p>
            <p className="text-base font-semibold text-white tabular-nums">
              $
              {(revenueData.length
                ? Math.max(...revenueData.map((d) => d.revenue))
                : 0
              ).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom Tooltip Component
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      day: string;
      revenue: number;
      shipments: number;
    };
  }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-md px-3 py-2.5 shadow-lg">
      <p className="text-xs text-slate-400 mb-2 font-bold">{data.day}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <span className="text-sm text-white font-mono">
            ${data.revenue.toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-slate-500 pl-4">
          {data.shipments} shipments
        </p>
      </div>
    </div>
  );
};
