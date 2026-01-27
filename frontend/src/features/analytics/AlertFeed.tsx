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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="text-yellow-400" size={20} />
          System Alerts
        </h3>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
          {alerts.length} Active
        </span>
      </div>

      {/* Alert List */}
      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Info className="mx-auto mb-2 opacity-50" size={32} />
            <p className="text-sm">No active alerts</p>
            <p className="text-xs mt-1">All systems operational</p>
          </div>
        ) : (
          alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        )}
      </div>
    </div>
  );
};

// Individual Alert Card Component
const AlertCard = ({ alert }: { alert: Alert }) => {
  const isCritical = alert.type === "CRITICAL";

  return (
    <div
      className={`p-4 rounded-lg border transition-all hover:shadow-md ${
        isCritical
          ? "bg-red-900/20 border-red-500/50 hover:border-red-500"
          : "bg-blue-900/20 border-blue-500/50 hover:border-blue-500"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`p-2 rounded-full flex-shrink-0 ${
            isCritical ? "bg-red-900/50" : "bg-blue-900/50"
          }`}
        >
          {isCritical ? (
            <AlertTriangle className="text-red-400 animate-pulse" size={18} />
          ) : (
            <Anchor className="text-blue-400" size={18} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Alert Type Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                isCritical
                  ? "bg-red-500/30 text-red-200"
                  : "bg-blue-500/30 text-blue-200"
              }`}
            >
              {alert.type}
            </span>
            <span className="text-[10px] text-slate-500">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Message */}
          <p className="text-sm text-white mb-2">{alert.message}</p>

          {/* Vessel Details */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Ship size={12} />
              {alert.vessel.imo_number}
            </span>
            <span className="text-slate-600">|</span>
            <span>{alert.vessel.type}</span>
            <span className="text-slate-600">|</span>
            <span>{alert.vessel.speed_knots.toFixed(1)} kn</span>
          </div>

          {/* Critical Action Button */}
          {isCritical && (
            <button className="mt-3 text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded font-bold transition-colors">
              Request Assistance
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
