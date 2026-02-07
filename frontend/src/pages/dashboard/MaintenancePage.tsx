import { useState, useMemo } from "react";
import {
  useGetVesselsQuery,
  useGetComponentsQuery,
  usePerformMaintenanceMutation,
  useRefuelVesselMutation,
  type Component,
  type Vessel,
} from "../../features/api/apiSlice";
import {
  Loader2,
  Wrench,
  Ship,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Zap,
  Fuel,
} from "lucide-react";

export const MaintenancePage = () => {
  const { data: vessels, isLoading: loadingVessels } = useGetVesselsQuery(
    undefined,
    { pollingInterval: 5000 },
  );
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);

  const selectedVessel = vessels?.find((v) => v.id === selectedVesselId);

  if (loadingVessels) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-orange-500" size={32} />
          <span className="text-slate-400 font-medium">
            Loading fleet data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* ✨ Modern Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg shadow-orange-500/20">
              <Wrench className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Maintenance & Engineering
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Monitor fuel levels, service components, and manage vessel
                maintenance
              </p>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl px-6 py-3">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              Total Fleet
            </div>
            <div className="text-2xl font-bold text-white">
              {vessels?.length || 0}
            </div>
          </div>
        </div>

        {/* ✨ Modern Vessel Tabs */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {vessels?.map((vessel) => {
              const isActive = selectedVesselId === vessel.id;
              return (
                <button
                  key={vessel.id}
                  onClick={() => setSelectedVesselId(vessel.id)}
                  className={`p-4 rounded-xl transition-all duration-300 text-left ${
                    isActive
                      ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                      : "bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Ship
                      size={16}
                      className={isActive ? "text-white" : "text-orange-400"}
                    />
                    <span className="font-bold text-sm truncate">
                      {vessel.name}
                    </span>
                  </div>
                  <p
                    className={`text-xs ${isActive ? "text-white/80" : "text-slate-500"}`}
                  >
                    {vessel.type}
                  </p>
                  {vessel.status === "DISTRESS" && (
                    <div className="mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-red-400" />
                      <span className="text-xs font-bold text-red-400">
                        DISTRESS
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        {!selectedVessel ? (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-16 text-center">
            <div className="p-6 bg-slate-800/50 rounded-2xl inline-block mb-6">
              <Ship className="text-slate-600" size={64} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              No Vessel Selected
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Select a vessel from the tabs above to view fuel levels,
              components, and maintenance status
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <FuelGauge vessel={selectedVessel} />
            <ComponentInspector vesselId={selectedVessel.id} />
          </div>
        )}
      </div>
    </div>
  );
};

// Fuel Gauge Component
const FuelGauge = ({ vessel }: { vessel: Vessel }) => {
  const [refuelVessel, { isLoading: isRefueling }] = useRefuelVesselMutation();
  const fuelPercentage = (vessel.fuel_level / vessel.fuel_capacity) * 100;
  const isLowFuel = fuelPercentage < 20;

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Fuel className="text-orange-400" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Fuel Management</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitor bunker fuel and refuel operations
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fuel Gauge Visual */}
          <div className="lg:col-span-1">
            <div className="relative h-56 bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
              <div
                className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${
                  isLowFuel
                    ? "bg-gradient-to-t from-red-600 to-orange-500"
                    : "bg-gradient-to-t from-orange-600 to-amber-400"
                }`}
                style={{ height: `${fuelPercentage}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[1px]">
                <div className="text-center drop-shadow-lg">
                  <div
                    className={`text-5xl font-bold ${isLowFuel ? "text-red-300" : "text-white"}`}
                  >
                    {fuelPercentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-300 mt-2 font-medium">
                    Fuel Level
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fuel Stats & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                  Current Level
                </div>
                <div className="text-2xl font-bold text-white">
                  {vessel.fuel_level.toFixed(0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">tons</div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                  Capacity
                </div>
                <div className="text-2xl font-bold text-white">
                  {vessel.fuel_capacity}
                </div>
                <div className="text-xs text-slate-500 mt-1">tons</div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                  Available Space
                </div>
                <div
                  className={`text-2xl font-bold ${isLowFuel ? "text-orange-400" : "text-green-400"}`}
                >
                  {(vessel.fuel_capacity - vessel.fuel_level).toFixed(0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">tons</div>
              </div>
            </div>

            {/* Alerts */}
            {isLowFuel && vessel.status !== "DISTRESS" && (
              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <AlertTriangle className="text-yellow-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-yellow-400 mb-1">
                    Low Fuel Warning
                  </p>
                  <p className="text-xs text-yellow-300/70">
                    Fuel level is below 20%. Refueling recommended to avoid
                    operational disruption.
                  </p>
                </div>
              </div>
            )}

            {/* Refuel Button */}
            <button
              onClick={() => refuelVessel(vessel.id)}
              disabled={isRefueling || fuelPercentage > 95}
              className={`w-full px-6 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 ${
                vessel.status === "DISTRESS"
                  ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20"
                  : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-lg shadow-orange-500/20"
              } disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed`}
            >
              {isRefueling ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Refueling in Progress...
                </>
              ) : (
                <>
                  <Zap size={20} />
                  {vessel.status === "DISTRESS"
                    ? "EMERGENCY REFUEL NOW"
                    : "Initiate Refuel Operation"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component Inspector Sub-Component
const ComponentInspector = ({ vesselId }: { vesselId: string }) => {
  const { data, isLoading, error } = useGetComponentsQuery(vesselId);
  const [performMaintenance, { isLoading: isMaintaining }] =
    usePerformMaintenanceMutation();

  const handleMaintenance = async (componentId: string) => {
    if (
      window.confirm(
        "Perform maintenance? This will restore the component to 100% health.",
      )
    ) {
      try {
        await performMaintenance(componentId).unwrap();
      } catch {
        alert("Maintenance failed. Please try again.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-orange-400" size={28} />
        <span className="text-slate-300 font-medium">
          Loading components...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-8 text-red-200">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="text-red-400" size={24} />
          <p className="font-bold text-lg">Failed to load components</p>
        </div>
        <p className="text-sm text-red-400/80">Please try again later</p>
      </div>
    );
  }

  if (!data || data.total_count === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-16 text-center">
        <div className="p-6 bg-slate-800/50 rounded-2xl inline-block mb-6">
          <Wrench className="text-slate-600" size={64} />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">
          No Components Found
        </h3>
        <p className="text-slate-400">
          This vessel has no registered components for monitoring
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Wrench className="text-blue-400" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Component Health Monitor
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Track and maintain vessel systems
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Critical"
            value={data.summary.critical}
            color="red"
            icon={<AlertTriangle size={16} />}
          />
          <StatCard
            label="Warning"
            value={data.summary.warning}
            color="yellow"
            icon={<AlertTriangle size={16} />}
          />
          <StatCard
            label="Operational"
            value={data.summary.operational}
            color="green"
            icon={<CheckCircle2 size={16} />}
          />
        </div>
      </div>

      {/* Components Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.components.map((component) => (
          <ComponentCard
            key={component.id}
            component={component}
            onMaintain={handleMaintenance}
            isMaintaining={isMaintaining}
          />
        ))}
      </div>
    </div>
  );
};

// Stat Card
const StatCard = ({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "red" | "yellow" | "green";
  icon: React.ReactNode;
}) => {
  const colorClasses = {
    red: "bg-red-500/10 border-red-500/30 text-red-300",
    yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
    green: "bg-green-500/10 border-green-500/30 text-green-300",
  };

  return (
    <div
      className={`${colorClasses[color]} border rounded-xl p-4 flex items-center justify-between transition-all hover:border-opacity-50`}
    >
      <div>
        <p className="text-xs uppercase tracking-wider mb-1 opacity-70">
          {label}
        </p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      {icon}
    </div>
  );
};

// Component Card
const ComponentCard = ({
  component,
  onMaintain,
  isMaintaining,
}: {
  component: Component;
  onMaintain: (id: string) => void;
  isMaintaining: boolean;
}) => {
  const getHealthColor = (health: number) => {
    if (health >= 80) return "bg-green-500";
    if (health >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPERATIONAL":
        return "bg-green-900/30 text-green-300 border-green-500/50";
      case "WARNING":
        return "bg-yellow-900/30 text-yellow-300 border-yellow-500/50";
      case "CRITICAL":
        return "bg-red-900/30 text-red-300 border-red-500/50";
      default:
        return "bg-slate-800 text-slate-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PROPULSION":
        return <Zap size={16} className="text-blue-400" />;
      case "ELECTRICAL":
        return <Zap size={16} className="text-yellow-400" />;
      case "NAVIGATION":
        return <Gauge size={16} className="text-cyan-400" />;
      case "HULL":
        return <Ship size={16} className="text-slate-400" />;
      default:
        return <Wrench size={16} className="text-slate-400" />;
    }
  };

  const daysSinceService = useMemo(() => {
    const lastMaintenanceDate = new Date(component.last_maintenance);
    const currentDate = new Date();
    const diffInMs = currentDate.getTime() - lastMaintenanceDate.getTime();
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  }, [component.last_maintenance]);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900/50 rounded-lg">
            {getTypeIcon(component.type)}
          </div>
          <div>
            <h4 className="font-bold text-white">{component.name}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{component.type}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase border ${getStatusColor(
            component.status,
          )}`}
        >
          {component.status}
        </span>
      </div>

      {/* Health Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Component Health</span>
          <span className="font-mono font-bold text-white">
            {component.health_percentage.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700">
          <div
            className={`h-full transition-all ${getHealthColor(
              component.health_percentage,
            )}`}
            style={{ width: `${component.health_percentage}%` }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-2 mb-4 bg-slate-900/30 rounded-lg p-3 border border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Operating Hours</span>
          <span className="text-slate-200 font-mono font-medium">
            {component.total_operating_hours.toFixed(0)}h
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock size={12} />
            Last Service
          </span>
          <span className="text-slate-200 font-medium">
            {daysSinceService} days ago
          </span>
        </div>
      </div>

      {/* Action Button */}
      {component.status !== "OPERATIONAL" && (
        <button
          onClick={() => onMaintain(component.id)}
          disabled={isMaintaining}
          className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:bg-slate-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
        >
          {isMaintaining ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Servicing...
            </>
          ) : (
            <>
              <Wrench size={16} />
              Perform Maintenance
            </>
          )}
        </button>
      )}
    </div>
  );
};
