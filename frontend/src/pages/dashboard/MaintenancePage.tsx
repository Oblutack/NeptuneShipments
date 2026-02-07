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
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="animate-spin" />
        Loading fleet data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <Wrench className="text-orange-400" size={32} />
        <div>
          <h1 className="text-3xl font-bold text-white">
            Maintenance & Engineering
          </h1>
          <p className="text-sm text-slate-500">
            Monitor and service vessel components
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT: Vessel List */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg max-h-150 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Fleet Registry
          </h2>
          <div className="space-y-2">
            {vessels?.map((vessel) => (
              <button
                key={vessel.id}
                onClick={() => setSelectedVesselId(vessel.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedVesselId === vessel.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Ship size={14} />
                  <span className="font-bold text-sm truncate">
                    {vessel.name}
                  </span>
                </div>
                <p className="text-xs opacity-70">{vessel.type}</p>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Component Inspector */}
        <div className="lg:col-span-3">
          {!selectedVessel ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <Ship className="mx-auto mb-4 text-slate-600" size={48} />
              <p className="text-slate-400 font-semibold mb-2">
                No Vessel Selected
              </p>
              <p className="text-sm text-slate-600">
                Select a vessel from the list to view its components
              </p>
            </div>
          ) : (
            <>
              <FuelGauge vessel={selectedVessel} />
              <ComponentInspector vesselId={selectedVessel.id} />
            </>
          )}
        </div>
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <Fuel className="text-orange-400" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Fuel Management</h3>
          <p className="text-xs text-slate-500">Monitor and refuel vessel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fuel Gauge */}
        <div className="bg-slate-950 p-6 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-400 uppercase">
              Bunker Fuel Level
            </span>
            <span
              className={`text-xs font-bold ${
                isLowFuel ? "text-red-400" : "text-green-400"
              }`}
            >
              {fuelPercentage.toFixed(1)}%
            </span>
          </div>

          <div className="relative h-48 w-20 mx-auto bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700">
            <div
              className={`absolute bottom-0 w-full transition-all duration-1000 ${
                isLowFuel ? "bg-red-600 animate-pulse" : "bg-orange-500"
              }`}
              style={{ height: `${fuelPercentage}%` }}
            ></div>
          </div>

          <div className="text-center mt-4">
            <div className="text-2xl font-mono font-bold text-white">
              {vessel.fuel_level.toFixed(0)}
            </div>
            <div className="text-xs text-slate-500">
              / {vessel.fuel_capacity} Tons
            </div>
          </div>
        </div>

        {/* Fuel Stats & Actions */}
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">
              Fuel Status
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Current Level</span>
                <span className="text-sm font-bold text-white">
                  {vessel.fuel_level.toFixed(0)} tons
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Capacity</span>
                <span className="text-sm font-bold text-white">
                  {vessel.fuel_capacity} tons
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Remaining</span>
                <span
                  className={`text-sm font-bold ${
                    isLowFuel ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {(vessel.fuel_capacity - vessel.fuel_level).toFixed(0)} tons
                </span>
              </div>
            </div>
          </div>

          {/* Refuel Button */}
          <button
            onClick={() => refuelVessel(vessel.id)}
            disabled={isRefueling || fuelPercentage > 95}
            className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              vessel.status === "DISTRESS"
                ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20"
                : "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20"
            } disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none`}
          >
            {isRefueling ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Refueling...
              </>
            ) : (
              <>
                <Zap size={16} />
                {vessel.status === "DISTRESS"
                  ? "EMERGENCY REFUEL"
                  : "Refuel Vessel"}
              </>
            )}
          </button>

          {isLowFuel && vessel.status !== "DISTRESS" && (
            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle
                className="text-yellow-400 flex-shrink-0 mt-0.5"
                size={16}
              />
              <div>
                <p className="text-xs font-bold text-yellow-400">
                  Low Fuel Warning
                </p>
                <p className="text-xs text-yellow-300/70 mt-1">
                  Fuel level is below 20%. Consider refueling soon.
                </p>
              </div>
            </div>
          )}
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-400" size={24} />
        <span className="text-slate-400">Loading components...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-red-200">
        <p className="font-bold mb-2">Failed to load components</p>
        <p className="text-sm text-red-400">Please try again later</p>
      </div>
    );
  }

  if (!data || data.total_count === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <Wrench className="mx-auto mb-4 text-slate-600" size={48} />
        <p className="text-slate-400 font-semibold mb-2">No Components Found</p>
        <p className="text-sm text-slate-600">
          This vessel has no registered components
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
      {/* Header with Stats */}
      <div className="bg-linear-to-r from-slate-950 to-slate-900 border-b border-slate-800 p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Component Health Monitor
        </h2>

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
    red: "bg-red-900/30 border-red-500/50 text-red-300",
    yellow: "bg-yellow-900/30 border-yellow-500/50 text-yellow-300",
    green: "bg-green-900/30 border-green-500/50 text-green-300",
  };

  return (
    <div
      className={`${colorClasses[color]} border rounded-lg p-4 flex items-center justify-between`}
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
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getTypeIcon(component.type)}
          <div>
            <h4 className="font-bold text-white text-sm">{component.name}</h4>
            <p className="text-xs text-slate-500">{component.type}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(
            component.status,
          )}`}
        >
          {component.status}
        </span>
      </div>

      {/* Health Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Health</span>
          <span className="font-mono font-bold text-white">
            {component.health_percentage.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${getHealthColor(
              component.health_percentage,
            )}`}
            style={{ width: `${component.health_percentage}%` }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Operating Hours</span>
          <span className="text-slate-300 font-mono">
            {component.total_operating_hours.toFixed(0)}h
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1">
            <Clock size={12} />
            Last Service
          </span>
          <span className="text-slate-300">{daysSinceService} days ago</span>
        </div>
      </div>

      {/* Action Button */}
      {component.status !== "OPERATIONAL" && (
        <button
          onClick={() => onMaintain(component.id)}
          disabled={isMaintaining}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          {isMaintaining ? (
            <>
              <Loader2 className="animate-spin" size={14} />
              Servicing...
            </>
          ) : (
            <>
              <Wrench size={14} />
              Service Now
            </>
          )}
        </button>
      )}
    </div>
  );
};
