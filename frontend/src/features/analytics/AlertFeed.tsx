import { formatDistanceToNowStrict } from "date-fns";
import {
  useAcknowledgeAlertMutation,
  useGetAlertsQuery,
  type PersistedAlert,
  type Vessel,
} from "../api/apiSlice";
import { AlertTriangle, Info, Anchor, Ship, Check, Loader2 } from "lucide-react";

interface AlertFeedProps {
  // Used only to show a vessel's details on its alerts; alerts about a
  // vessel that has since been deleted simply show its name.
  vessels: Vessel[] | undefined;
}

const KIND_LABEL: Record<PersistedAlert["kind"], string> = {
  OUT_OF_FUEL: "Out of fuel",
  MECHANICAL_FAILURE: "Mechanical failure",
  ARRIVED: "Arrival",
  RECOVERED: "Recovered",
};

// The server's alert history: unacknowledged alerts, unresolved CRITICAL
// conditions first. Alerts persist across page loads and server restarts,
// and acknowledging one is recorded against the operator who did it.
export const AlertFeed = ({ vessels }: AlertFeedProps) => {
  const {
    data: alerts = [],
    isLoading,
    isError,
  } = useGetAlertsQuery("open", { pollingInterval: 30000 });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-slate-500" size={16} />
            <h3 className="text-sm font-semibold text-white">System Alerts</h3>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
            {alerts.length} Active
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-400" size={24} />
            </div>
          ) : isError ? (
            <p className="text-center text-sm text-red-400 py-12">
              Couldn't load alerts
            </p>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-4">
                <Info className="text-slate-600" size={40} />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                No active alerts
              </h3>
              <p className="text-sm text-slate-500">All systems operational</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                vessel={vessels?.find((v) => v.id === alert.vessel_id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const AlertCard = ({
  alert,
  vessel,
}: {
  alert: PersistedAlert;
  vessel: Vessel | undefined;
}) => {
  const [acknowledge, { isLoading: isAcknowledging }] =
    useAcknowledgeAlertMutation();
  const isCritical = alert.level === "CRITICAL";
  // A CRITICAL alert is a condition: ongoing until the vessel recovers.
  const isOngoing = isCritical && !alert.resolved_at;

  return (
    <div
      className={`p-3 rounded-md bg-slate-950/50 border-l-2 ${
        isCritical ? "border-red-500" : "border-blue-500"
      }`}
    >
      <div className="flex items-start gap-3">
        {isCritical ? (
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
        ) : (
          <Anchor className="text-blue-400 shrink-0 mt-0.5" size={16} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                isCritical
                  ? "bg-red-500/15 text-red-400"
                  : "bg-blue-500/15 text-blue-400"
              }`}
            >
              {KIND_LABEL[alert.kind] ?? alert.kind}
            </span>
            {isCritical && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  isOngoing
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-emerald-500/15 text-emerald-400"
                }`}
              >
                {isOngoing ? "Ongoing" : "Resolved"}
              </span>
            )}
            <span
              className="text-[10px] text-slate-500"
              title={new Date(alert.created_at).toLocaleString()}
            >
              {formatDistanceToNowStrict(new Date(alert.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>

          <p className="text-sm text-white mb-1.5">{alert.message}</p>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Ship size={11} />
              {vessel ? vessel.imo_number : alert.vessel_name}
            </span>
            {vessel && (
              <>
                <span>{vessel.type}</span>
                <span>{vessel.speed_knots.toFixed(1)} kn</span>
              </>
            )}
          </div>

          <button
            onClick={() => acknowledge(alert.id)}
            disabled={isAcknowledging}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
          >
            {isAcknowledging ? (
              <Loader2 className="animate-spin" size={12} />
            ) : (
              <Check size={12} />
            )}
            {isCritical ? "Acknowledge" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
};
