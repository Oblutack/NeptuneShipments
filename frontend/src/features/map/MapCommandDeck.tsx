import {
  useGetVesselsQuery,
  useGetPortStatsQuery,
  type Vessel,
} from "../api/apiSlice";
import { Ship, Anchor, Activity, Loader2, MapPin } from "lucide-react";

export const MapCommandDeck = () => {
  const { data: vessels, isLoading: vesselsLoading } = useGetVesselsQuery(
    undefined,
    {
      pollingInterval: 3000, // Real-time updates
    },
  );
  const { data: portStats, isLoading: portsLoading } = useGetPortStatsQuery();

  // Filter vessels that are actively at sea
  const activeVessels = vessels?.filter(
    (v) => v.status === "AT_SEA" && v.current_route_id,
  );

  if (vesselsLoading || portsLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-400" size={24} />
        <span className="text-slate-400 font-medium">
          Loading command deck...
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-slate-500" size={16} />
            <h2 className="text-sm font-semibold text-white">
              Live Operations Command Deck
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md font-medium tabular-nums">
              {activeVessels?.length || 0} Active Voyages
            </span>
            <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md font-medium tabular-nums">
              {portStats?.total_ports || 0} Ports Monitored
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-800">
        {/* LEFT: Voyage Progress */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Ship className="text-slate-500" size={15} />
            <h3 className="text-sm font-semibold text-white">
              Active Voyage Status
            </h3>
          </div>

          {!activeVessels || activeVessels.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-4">
                <Ship className="text-slate-600" size={40} />
              </div>
              <p className="text-sm text-slate-500 font-medium">
                No active voyages
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 hide-scrollbar">
              {activeVessels.map((vessel) => (
                <VoyageProgressCard key={vessel.id} vessel={vessel} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Port Congestion */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Anchor className="text-slate-500" size={15} />
            <h3 className="text-sm font-semibold text-white">
              Port Congestion Monitor
            </h3>
          </div>

          {!portStats?.ports || portStats.ports.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-4">
                <Anchor className="text-slate-600" size={40} />
              </div>
              <p className="text-sm text-slate-500 font-medium">
                No port data available
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2 hide-scrollbar">
              {portStats.ports.slice(0, 10).map((port) => (
                <PortCongestionCard key={port.id} port={port} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Voyage Progress Card Component
interface VoyageProgressCardProps {
  vessel: Vessel;
}

const VoyageProgressCard = ({ vessel }: VoyageProgressCardProps) => {
  const progress = (vessel.route_progress || 0) * 100;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
      {/* Top Row */}
      <div className="flex justify-between items-start mb-2.5">
        <div className="flex items-center gap-2">
          <Ship size={14} className="text-slate-500" />
          <span className="font-medium text-white text-sm">
            {vessel.name}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium tabular-nums">
          {vessel.speed_knots.toFixed(1)} kn
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-500">
            Progress to destination
          </span>
          <span className="text-xs font-medium text-blue-400 tabular-nums">
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <MapPin size={11} />
        <span>IMO: {vessel.imo_number}</span>
        <span>{vessel.type}</span>
      </div>
    </div>
  );
};

// Port Congestion Card Component
interface PortCongestionCardProps {
  port: {
    id: string;
    name: string;
    locode: string;
    ship_count: number;
  };
}

const PortCongestionCard = ({ port }: PortCongestionCardProps) => {
  // Traffic light logic
  const getStatusColor = (count: number) => {
    if (count > 5) return { text: "text-red-400", dot: "bg-red-500" };
    if (count > 2) return { text: "text-amber-400", dot: "bg-amber-500" };
    return { text: "text-emerald-400", dot: "bg-emerald-500" };
  };

  const status = getStatusColor(port.ship_count);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
      <div className="flex justify-between items-center">
        {/* Left: Port Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <Anchor size={13} className="text-slate-500" />
            <span className="font-medium text-white text-sm">
              {port.name}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {port.locode}
          </span>
        </div>

        {/* Right: Traffic Light + Count */}
        <div className="flex items-center gap-2.5">
          <span
            className={`text-sm font-medium tabular-nums ${status.text}`}
          >
            {port.ship_count} {port.ship_count === 1 ? "ship" : "ships"}
          </span>
          <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
        </div>
      </div>
    </div>
  );
};
