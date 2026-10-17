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
  CalendarClock,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { DataTable } from "../../components/ui/DataTable";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { computeCII, CII_RATING_COLOR } from "../../lib/cii";
import { daysUntil } from "../../lib/dates";

export const MaintenancePage = () => {
  const { data: vessels, isLoading: loadingVessels } = useGetVesselsQuery(
    undefined,
    { pollingInterval: 5000 },
  );
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);

  const selectedVessel = vessels?.find((v) => v.id === selectedVesselId);

  if (loadingVessels) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-400" size={28} />
          <span className="text-slate-400 font-medium">
            Loading fleet data...
          </span>
        </div>
      </div>
    );
  }

  const columns: ColumnDef<Vessel>[] = [
    {
      accessorKey: "name",
      header: "Vessel",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Ship size={14} className="text-slate-500" />
          <span className="font-medium text-white">{row.original.name}</span>
          {row.original.status === "DISTRESS" && (
            <AlertTriangle size={13} className="text-red-400" />
          )}
        </div>
      ),
    },
    { accessorKey: "type", header: "Type" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "fuel",
      header: "Fuel",
      cell: ({ row }) => {
        const pct =
          (row.original.fuel_level / row.original.fuel_capacity) * 100;
        return (
          <div className="flex items-center gap-2 w-28">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  pct < 20 ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-9 text-right tabular-nums">
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        icon={Wrench}
        title="Maintenance & Engineering"
        subtitle="Monitor fuel levels, service components, and manage vessel maintenance"
        actions={
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">
              Total Fleet
            </div>
            <div className="text-lg font-semibold text-white">
              {vessels?.length || 0}
            </div>
          </div>
        }
      />

      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={vessels || []}
          onRowClick={(vessel) => setSelectedVesselId(vessel.id)}
          isRowSelected={(vessel) => vessel.id === selectedVesselId}
        />

        {!selectedVessel ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-16 text-center">
            <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-5">
              <Ship className="text-slate-600" size={48} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1.5">
              No Vessel Selected
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Select a vessel from the table above to view fuel levels,
              components, and maintenance status
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <FuelGauge vessel={selectedVessel} />
            <ComponentInspector vesselId={selectedVessel.id} />
          </div>
        )}
      </div>
    </>
  );
};

// Fuel Gauge Component
const FuelGauge = ({ vessel }: { vessel: Vessel }) => {
  const [refuelVessel, { isLoading: isRefueling }] = useRefuelVesselMutation();
  const fuelPercentage = (vessel.fuel_level / vessel.fuel_capacity) * 100;
  const isLowFuel = fuelPercentage < 20;
  const cii = computeCII(vessel);
  const surveyDaysLeft = vessel.next_survey_due
    ? daysUntil(vessel.next_survey_due)
    : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Fuel className="text-slate-500" size={16} />
          <h3 className="text-sm font-semibold text-white">
            Fuel Management
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Fuel Gauge Visual */}
          <div className="lg:col-span-1">
            <div className="relative h-48 bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
              <div
                className={`absolute bottom-0 left-0 right-0 transition-all duration-500 opacity-30 ${
                  isLowFuel ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{ height: `${fuelPercentage}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className={`text-4xl font-semibold tabular-nums ${isLowFuel ? "text-red-400" : "text-white"}`}
                  >
                    {fuelPercentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-500 mt-1.5">
                    Fuel Level
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fuel Stats & Actions */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">
                  Current Level
                </div>
                <div className="text-xl font-semibold text-white tabular-nums">
                  {vessel.fuel_level.toFixed(0)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">tons</div>
              </div>

              <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">
                  Capacity
                </div>
                <div className="text-xl font-semibold text-white tabular-nums">
                  {vessel.fuel_capacity}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">tons</div>
              </div>

              <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">
                  Available Space
                </div>
                <div className="text-xl font-semibold text-white tabular-nums">
                  {(vessel.fuel_capacity - vessel.fuel_level).toFixed(0)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">tons</div>
              </div>

              <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">
                  CII Rating (est.)
                </div>
                {cii ? (
                  <>
                    <div
                      className={`inline-flex items-center justify-center w-7 h-7 rounded text-sm font-bold ${CII_RATING_COLOR[cii.rating]}`}
                    >
                      {cii.rating}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {(cii.ratio * 100).toFixed(0)}% of reference
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-600 mt-1">
                    Not enough voyage data
                  </div>
                )}
              </div>
            </div>

            {/* Alerts */}
            {isLowFuel && vessel.status !== "DISTRESS" && (
              <div className="bg-amber-500/10 border-l-2 border-amber-500 rounded-md p-3.5 flex items-start gap-3">
                <AlertTriangle
                  className="text-amber-400 shrink-0 mt-0.5"
                  size={18}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-300 mb-0.5">
                    Low Fuel Warning
                  </p>
                  <p className="text-xs text-amber-300/70">
                    Fuel level is below 20%. Refueling recommended to avoid
                    operational disruption.
                  </p>
                </div>
              </div>
            )}

            {surveyDaysLeft !== null && surveyDaysLeft <= 90 && (
              <div
                className={`rounded-md p-3.5 flex items-start gap-3 border-l-2 ${
                  surveyDaysLeft < 0
                    ? "bg-red-500/10 border-red-500"
                    : "bg-amber-500/10 border-amber-500"
                }`}
              >
                <CalendarClock
                  className={`shrink-0 mt-0.5 ${surveyDaysLeft < 0 ? "text-red-400" : "text-amber-400"}`}
                  size={18}
                />
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium mb-0.5 ${surveyDaysLeft < 0 ? "text-red-300" : "text-amber-300"}`}
                  >
                    {surveyDaysLeft < 0
                      ? "Class Survey Overdue"
                      : "Class Survey Due Soon"}
                  </p>
                  <p
                    className={`text-xs ${surveyDaysLeft < 0 ? "text-red-300/70" : "text-amber-300/70"}`}
                  >
                    {surveyDaysLeft < 0
                      ? `Overdue by ${Math.abs(surveyDaysLeft)} days - schedule dry-dock immediately.`
                      : `Due in ${surveyDaysLeft} days (${new Date(vessel.next_survey_due!).toLocaleDateString()}).`}
                  </p>
                </div>
              </div>
            )}

            {/* Refuel Button */}
            <button
              onClick={() => refuelVessel(vessel.id)}
              disabled={isRefueling || fuelPercentage > 95}
              className={`w-full px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                vessel.status === "DISTRESS"
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              } disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed`}
            >
              {isRefueling ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Refueling in Progress...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  {vessel.status === "DISTRESS"
                    ? "Emergency Refuel Now"
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
  const [maintainTargetId, setMaintainTargetId] = useState<string | null>(
    null,
  );

  const handleMaintenance = async () => {
    if (!maintainTargetId) return;
    await performMaintenance(maintainTargetId).unwrap();
    setMaintainTargetId(null);
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-400" size={24} />
        <span className="text-slate-400 font-medium">
          Loading components...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border-l-2 border-red-500 rounded-lg p-6 text-red-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="text-red-400" size={18} />
          <p className="font-semibold">Failed to load components</p>
        </div>
        <p className="text-sm text-red-400/70">Please try again later</p>
      </div>
    );
  }

  if (!data || data.total_count === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-16 text-center">
        <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-5">
          <Wrench className="text-slate-600" size={48} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1.5">
          No Components Found
        </h3>
        <p className="text-slate-500 text-sm">
          This vessel has no registered components for monitoring
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-3.5 space-y-3.5">
        <div className="flex items-center gap-2">
          <Wrench className="text-slate-500" size={16} />
          <h3 className="text-sm font-semibold text-white">
            Component Health Monitor
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Critical"
            value={data.summary.critical}
            color="red"
            icon={<AlertTriangle size={14} />}
          />
          <StatCard
            label="Warning"
            value={data.summary.warning}
            color="amber"
            icon={<AlertTriangle size={14} />}
          />
          <StatCard
            label="Operational"
            value={data.summary.operational}
            color="emerald"
            icon={<CheckCircle2 size={14} />}
          />
        </div>
      </div>

      {/* Components Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.components.map((component) => (
          <ComponentCard
            key={component.id}
            component={component}
            onMaintain={setMaintainTargetId}
            isMaintaining={isMaintaining}
          />
        ))}
      </div>

      {maintainTargetId && (
        <ConfirmDialog
          title="Perform Maintenance"
          message="This will restore the component to 100% health."
          confirmLabel="Perform Maintenance"
          onConfirm={handleMaintenance}
          onCancel={() => setMaintainTargetId(null)}
        />
      )}
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
  color: "red" | "amber" | "emerald";
  icon: React.ReactNode;
}) => {
  const colorClasses = {
    red: "bg-red-500/10 text-red-400",
    amber: "bg-amber-500/10 text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
  };

  return (
    <div
      className={`${colorClasses[color]} rounded-md p-3 flex items-center justify-between`}
    >
      <div>
        <p className="text-[10px] uppercase tracking-wide mb-1 opacity-70">
          {label}
        </p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
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
    if (health >= 80) return "bg-emerald-500";
    if (health >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPERATIONAL":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "WARNING":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "CRITICAL":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PROPULSION":
        return <Zap size={15} className="text-slate-500" />;
      case "ELECTRICAL":
        return <Zap size={15} className="text-slate-500" />;
      case "NAVIGATION":
        return <Gauge size={15} className="text-slate-500" />;
      case "HULL":
        return <Ship size={15} className="text-slate-500" />;
      default:
        return <Wrench size={15} className="text-slate-500" />;
    }
  };

  const daysSinceService = useMemo(() => {
    const lastMaintenanceDate = new Date(component.last_maintenance);
    const currentDate = new Date();
    const diffInMs = currentDate.getTime() - lastMaintenanceDate.getTime();
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  }, [component.last_maintenance]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          {getTypeIcon(component.type)}
          <div>
            <h4 className="font-medium text-white text-sm">
              {component.name}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">{component.type}</p>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${getStatusColor(
            component.status,
          )}`}
        >
          {component.status}
        </span>
      </div>

      {/* Health Bar */}
      <div className="mb-3.5">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Component Health</span>
          <span className="font-medium text-white tabular-nums">
            {component.health_percentage.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getHealthColor(
              component.health_percentage,
            )}`}
            style={{ width: `${component.health_percentage}%` }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-1.5 mb-3.5 bg-slate-900 rounded-md p-2.5 border border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Operating Hours</span>
          <span className="text-slate-300 tabular-nums">
            {component.total_operating_hours.toFixed(0)}h
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Clock size={11} />
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
          className="w-full bg-slate-800 hover:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isMaintaining ? (
            <>
              <Loader2 className="animate-spin" size={14} />
              Servicing...
            </>
          ) : (
            <>
              <Wrench size={14} />
              Perform Maintenance
            </>
          )}
        </button>
      )}
    </div>
  );
};
