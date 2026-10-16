import {
  useGetVesselsQuery,
  useGetShipmentsQuery,
} from "../../features/api/apiSlice";
import {
  Loader2,
  DollarSign,
  Anchor,
  Package,
  Activity,
  LayoutDashboard,
} from "lucide-react";
import { RevenueChart } from "../../features/analytics/RevenueChart";
import { AlertFeed } from "../../features/analytics/AlertFeed";
import { PageHeader } from "../../components/ui/PageHeader";

export const StatsPage = () => {
  const { data: vessels, isLoading: loadingVessels } = useGetVesselsQuery();
  const { data: shipments, isLoading: loadingShipments } =
    useGetShipmentsQuery();

  if (loadingVessels || loadingShipments) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-400" size={28} />
          <span className="text-slate-400 font-medium">
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

  const kpis = [
    {
      icon: DollarSign,
      label: "Est. Revenue (Active)",
      value: `$${activeRevenue.toLocaleString()}`,
      sub: `Lifetime: $${totalRevenue.toLocaleString()}`,
    },
    {
      icon: Anchor,
      label: "Fleet Utilization",
      value: activeShips,
      unit: `/ ${totalShips} at sea`,
    },
    {
      icon: Package,
      label: "Total Tonnage Moved",
      value: (totalWeight / 1000).toFixed(1),
      unit: "metric tons",
    },
    {
      icon: Activity,
      label: "Active Shipments",
      value: activeShipments,
      unit: "in transit",
    },
  ];

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="Executive Overview"
        subtitle="Real-time operational intelligence"
        actions={
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            System Online
          </div>
        }
      />

      <div className="space-y-6">
        {/* KPI GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-slate-900 border border-slate-800 p-5 rounded-lg hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <kpi.icon className="text-slate-500" size={16} />
                <span className="text-slate-400 text-sm font-medium">
                  {kpi.label}
                </span>
              </div>
              <div className="text-2xl font-semibold text-white">
                {kpi.value}{" "}
                {kpi.unit && (
                  <span className="text-sm text-slate-500 font-normal">
                    {kpi.unit}
                  </span>
                )}
              </div>
              {kpi.sub && (
                <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-800">
                  {kpi.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ANALYTICS & LOGS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueChart />
          <AlertFeed vessels={vessels || []} />
        </div>
      </div>
    </>
  );
};
