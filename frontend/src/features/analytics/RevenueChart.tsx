import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

// Mock revenue data for the last 7 days
const revenueData = [
  { day: "Mon", revenue: 12400, shipments: 8 },
  { day: "Tue", revenue: 15800, shipments: 12 },
  { day: "Wed", revenue: 18200, shipments: 14 },
  { day: "Thu", revenue: 14500, shipments: 10 },
  { day: "Fri", revenue: 21300, shipments: 16 },
  { day: "Sat", revenue: 19700, shipments: 15 },
  { day: "Sun", revenue: 24500, shipments: 18 },
];

// Calculate growth percentage
const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
const avgDailyRevenue = totalRevenue / revenueData.length;
const growthRate =
  ((revenueData[6].revenue - revenueData[0].revenue) / revenueData[0].revenue) *
  100;

export const RevenueChart = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      {/* Main Header - matches System Alerts style */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
        <h3 className="text-lg font-bold text-white">Revenue Trend</h3>
        <select className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded">
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Last 90 Days</option>
        </select>
      </div>

      {/* Stats Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs text-slate-500">Last 7 days</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            ${totalRevenue.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
            <TrendingUp size={12} />+{growthRate.toFixed(1)}% week
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={revenueData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {/* Grid */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e293b"
            vertical={false}
          />

          {/* X Axis */}
          <XAxis
            dataKey="day"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />

          {/* Y Axis */}
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />

          {/* Tooltip */}
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: "#3b82f6",
              strokeWidth: 1,
              strokeDasharray: "5 5",
            }}
          />

          {/* Area Fill */}
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorRevenue)"
            animationDuration={1000}
          />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800">
        <div>
          <p className="text-xs text-slate-500 mb-1">Avg Daily</p>
          <p className="text-lg font-bold text-white">
            $
            {avgDailyRevenue.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Peak Day</p>
          <p className="text-lg font-bold text-white">
            ${Math.max(...revenueData.map((d) => d.revenue)).toLocaleString()}
          </p>
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
    <div className="bg-slate-950/95 backdrop-blur-sm border border-blue-500/50 rounded-lg px-4 py-3 shadow-xl">
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
