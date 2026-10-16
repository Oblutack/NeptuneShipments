import { type Vessel } from "../api/apiSlice";
import { AlertTriangle, Info, Anchor, Ship } from "lucide-react";

interface AlertFeedProps {
  vessels: Vessel[] | undefined;
}

type Alert = {
  id: string;
  type: "CRITICAL" | "INFO";
  vessel: Vessel;
  message: string;
  timestamp: string;
};

export const AlertFeed = ({ vessels }: AlertFeedProps) => {
  // Generate alerts from vessel data
  const alerts: Alert[] = [];

  if (vessels) {
    vessels.forEach((vessel) => {
      if (vessel.status === "DISTRESS") {
        alerts.push({
          id: `${vessel.id}-distress`,
          type: "CRITICAL",
          vessel,
          message: `${vessel.name} has run out of fuel and is stranded`,
          timestamp: new Date().toISOString(),
        });
      } else if (vessel.status === "DOCKED") {
        alerts.push({
          id: `${vessel.id}-docked`,
          type: "INFO",
          vessel,
          message: `${vessel.name} has arrived and is now docked`,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // Sort by severity (CRITICAL first)
  alerts.sort((a, b) => {
    if (a.type === "CRITICAL" && b.type !== "CRITICAL") return -1;
    if (a.type !== "CRITICAL" && b.type === "CRITICAL") return 1;
    return 0;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-slate-500" size={16} />
            <h3 className="text-sm font-semibold text-white">
              System Alerts
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
            {alerts.length} Active
          </span>
        </div>
      </div>

      {/* Alert List */}
      <div className="p-3">
        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {alerts.length === 0 ? (
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
            alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
          )}
        </div>
      </div>
    </div>
  );
};

// Individual Alert Card Component
const AlertCard = ({ alert }: { alert: Alert }) => {
  const isCritical = alert.type === "CRITICAL";

  return (
    <div
      className={`p-3 rounded-md bg-slate-950/50 border-l-2 ${
        isCritical ? "border-red-500" : "border-blue-500"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {isCritical ? (
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
        ) : (
          <Anchor className="text-blue-400 shrink-0 mt-0.5" size={16} />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Alert Type Badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                isCritical
                  ? "bg-red-500/15 text-red-400"
                  : "bg-blue-500/15 text-blue-400"
              }`}
            >
              {alert.type}
            </span>
            <span className="text-[10px] text-slate-500">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Message */}
          <p className="text-sm text-white mb-1.5">{alert.message}</p>

          {/* Vessel Details */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Ship size={11} />
              {alert.vessel.imo_number}
            </span>
            <span>{alert.vessel.type}</span>
            <span>{alert.vessel.speed_knots.toFixed(1)} kn</span>
          </div>

          {/* Critical Action Button */}
          {isCritical && (
            <button className="mt-2.5 text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-md font-medium transition-colors">
              Request Assistance
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
