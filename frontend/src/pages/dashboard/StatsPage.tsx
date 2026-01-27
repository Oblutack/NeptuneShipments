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
} from "lucide-react";
import { RevenueChart } from "../../features/analytics/RevenueChart";
import { AlertFeed } from "../../features/analytics/AlertFeed";

export const StatsPage = () => {
  const { data: vessels, isLoading: loadingVessels } = useGetVesselsQuery();
  const { data: shipments, isLoading: loadingShipments } =
    useGetShipmentsQuery();

  if (loadingVessels || loadingShipments) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="animate-spin" /> crunching numbers...
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
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Executive Overview</h1>
          <p className="text-slate-400 mt-1">
            Real-time operational intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-green-400 bg-green-900/20 px-3 py-1 rounded-full border border-green-900/50">
          <Activity size={14} className="animate-pulse" /> SYSTEM ONLINE
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-blue-500/50 transition shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-900/20 rounded-lg text-blue-400">
              <DollarSign size={24} />
            </div>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <TrendingUp size={12} /> +12.5%
            </span>
          </div>
          <div className="text-slate-400 text-sm font-medium">
            Est. Revenue (Active)
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            ${activeRevenue.toLocaleString()}
          </div>
          {/* --- NEW: Display the Total Revenue here --- */}
          <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-800">
            Lifetime:{" "}
            <span className="text-slate-300">
              ${totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 2: Fleet Status */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-purple-500/50 transition shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-900/20 rounded-lg text-purple-400">
              <Anchor size={24} />
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
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-orange-500/50 transition shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-900/20 rounded-lg text-orange-400">
              <Package size={24} />
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
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-emerald-500/50 transition shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-900/20 rounded-lg text-emerald-400">
              <Activity size={24} />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        {/* Revenue Graph */}
        <RevenueChart />

        {/* Live Alert Feed */}
        <AlertFeed vessels={vessels || []} />
      </div>
    </div>
  );
};
