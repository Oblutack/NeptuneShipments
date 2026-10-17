import {
  Package,
  Ship,
  CheckCircle2,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import type { ShipmentEvent } from "../api/apiSlice";

const EVENT_ICON: Record<string, LucideIcon> = {
  BOOKED: Package,
  DEPARTED: Ship,
  DELIVERED: CheckCircle2,
};

const EVENT_COLOR: Record<string, string> = {
  BOOKED: "text-slate-400 bg-slate-800",
  DEPARTED: "text-blue-400 bg-blue-500/10",
  DELIVERED: "text-emerald-400 bg-emerald-500/10",
};

interface VoyageTimelineProps {
  events: ShipmentEvent[];
}

export const VoyageTimeline = ({ events }: VoyageTimelineProps) => {
  if (events.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-center text-sm text-slate-500">
        No voyage history recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-5">
        <MapPin size={16} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-white">Voyage History</h3>
      </div>

      <div className="space-y-5">
        {events.map((event, i) => {
          const Icon = EVENT_ICON[event.event_type] ?? Package;
          const colorClass =
            EVENT_COLOR[event.event_type] ?? "text-slate-400 bg-slate-800";
          const isLast = i === events.length - 1;

          return (
            <div key={event.id} className="flex gap-3.5 relative">
              {!isLast && (
                <div className="absolute left-[15px] top-8 bottom-[-20px] w-px bg-slate-800" />
              )}
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}
              >
                <Icon size={15} />
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">
                    {event.description}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wide">
                  {event.event_type}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
