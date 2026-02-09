import {
  useGetVesselsQuery,
  useGetShipmentsQuery,
} from "../../features/api/apiSlice";
import {
  Loader2,
  DollarSign,
  Anchor,
  Package,
  TrendingUp,
  Activity,
  LayoutDashboard,
} from "lucide-react";
import { RevenueChart } from "../../features/analytics/RevenueChart";
import { AlertFeed } from "../../features/analytics/AlertFeed";

export const StatsPage = () => {
  const { data: vessels, isLoading: loadingVessels } = useGetVesselsQuery();
  const { data: shipments, isLoading: loadingShipments } =
    useGetShipmentsQuery();

  if (loadingVessels || loadingShipments) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-400" size={32} />
          <span className="text-slate-300 font-medium">
            Crunching numbers...
          </span>
        </div>
      </div>
    );
  }

  // --- BUSINESS LOGIC (Calculations) ---

  // 1. Active Fleet Count
  const activeShips = vessels?.filter((v) => v.status === "AT_SEA").length || 0;
  const totalShips = vessels?.length || 0;

  // 2. Cargo Metrics
  const activeShipments =
    shipments?.filter((s) => s.status === "IN_TRANSIT").length || 0;
  const totalWeight = shipments?.reduce((sum, s) => sum + s.weight_kg, 0) || 0;

  // 3. Financials (Simulated: $2.50 per kg freight rate)
  const freightRate = 2.5;
  const activeRevenue = activeShipments > 0 ? totalWeight * freightRate : 0;
  const totalRevenue = (shipments?.length || 0) * 5000 * freightRate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* ✨ Modern Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20">
              <LayoutDashboard className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Executive Overview
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Real-time operational intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-green-400 bg-green-900/20 backdrop-blur-xl px-4 py-2 rounded-xl border border-green-500/30 shadow-lg shadow-green-500/10">
            <Activity size={16} className="animate-pulse" /> SYSTEM ONLINE
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Revenue */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/20">
                <DollarSign className="text-white" size={24} />
              </div>
              <span className="text-xs font-bold text-green-400 bg-green-900/30 px-3 py-1.5 rounded-xl border border-green-500/30 flex items-center gap-1">
                <TrendingUp size={12} /> +12.5%
              </span>
            </div>
            <div className="text-slate-400 text-sm font-medium">
              Est. Revenue (Active)
            </div>
            <div className="text-3xl font-bold text-white mt-1">
              ${activeRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-800">
              Lifetime:{" "}
              <span className="text-slate-300">
                ${totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 2: Fleet Status */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/20">
                <Anchor className="text-white" size={24} />
              </div>
            </div>
            <div className="text-slate-400 text-sm font-medium">
              Fleet Utilization
            </div>
            <div className="text-3xl font-bold text-white mt-1">
              {activeShips}{" "}
              <span className="text-lg text-slate-500 font-normal">
                / {totalShips} Ships
              </span>
            </div>
          </div>

          {/* Card 3: Cargo Volume */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-500/20">
                <Package className="text-white" size={24} />
              </div>
            </div>
            <div className="text-slate-400 text-sm font-medium">
              Total Tonnage Moved
            </div>
            <div className="text-3xl font-bold text-white mt-1">
              {(totalWeight / 1000).toFixed(1)}{" "}
              <span className="text-lg text-slate-500 font-normal">
                metric tons
              </span>
            </div>
          </div>

          {/* Card 4: Active Jobs */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20">
                <Activity className="text-white" size={24} />
              </div>
            </div>
            <div className="text-slate-400 text-sm font-medium">
              Active Shipments
            </div>
            <div className="text-3xl font-bold text-white mt-1">
              {activeShipments}
            </div>
          </div>
        </div>

        {/* ANALYTICS & LOGS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Graph */}
          <RevenueChart />

          {/* Live Alert Feed */}
          <AlertFeed vessels={vessels || []} />
        </div>
      </div>
    </div>
  );
};
