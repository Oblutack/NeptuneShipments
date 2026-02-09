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
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 flex items-center justify-center gap-3 shadow-xl">
        <Loader2 className="animate-spin text-blue-400" size={32} />
        <span className="text-slate-300 font-medium">
          Loading command deck...
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Activity className="text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">
              Live Operations Command Deck
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="bg-green-900/30 text-green-400 px-4 py-2 rounded-xl border border-green-500/30 font-bold">
              {activeVessels?.length || 0} Active Voyages
            </span>
            <span className="bg-blue-900/30 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/30 font-bold">
              {portStats?.total_ports || 0} Ports Monitored
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-800">
        {/* LEFT: Voyage Progress */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Ship className="text-green-400" size={18} />
            </div>
            <h3 className="text-lg font-bold text-white">
              Active Voyage Status
            </h3>
          </div>

          {!activeVessels || activeVessels.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-6 bg-slate-800/50 rounded-2xl inline-block mb-4">
                <Ship className="text-slate-600" size={48} />
              </div>
              <p className="text-sm text-slate-400 font-medium">
                No active voyages
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 hide-scrollbar">
              {activeVessels.map((vessel) => (
                <VoyageProgressCard key={vessel.id} vessel={vessel} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Port Congestion */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Anchor className="text-orange-400" size={18} />
            </div>
            <h3 className="text-lg font-bold text-white">
              Port Congestion Monitor
            </h3>
          </div>

          {!portStats?.ports || portStats.ports.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-6 bg-slate-800/50 rounded-2xl inline-block mb-4">
                <Anchor className="text-slate-600" size={48} />
              </div>
              <p className="text-sm text-slate-400 font-medium">
                No port data available
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 hide-scrollbar">
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
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
      {/* Top Row */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <Ship size={16} className="text-blue-400" />
          <span className="font-bold text-white">{vessel.name}</span>
        </div>
        <span className="text-xs bg-green-900/30 text-green-400 px-3 py-1.5 rounded-xl border border-green-500/30 font-bold">
          {vessel.speed_knots.toFixed(1)} kn
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400 font-medium">
            Progress to destination
          </span>
          <span className="text-xs font-bold text-blue-400">
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-500 ease-out shadow-lg shadow-blue-500/30"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <MapPin size={12} />
        <span>IMO: {vessel.imo_number}</span>
        <span className="text-slate-700">|</span>
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
    if (count > 5)
      return {
        bg: "bg-red-900/30",
        text: "text-red-400",
        border: "border-red-500/30",
        dot: "bg-red-500",
      };
    if (count > 2)
      return {
        bg: "bg-yellow-900/30",
        text: "text-yellow-400",
        border: "border-yellow-500/30",
        dot: "bg-yellow-500",
      };
    return {
      bg: "bg-green-900/30",
      text: "text-green-400",
      border: "border-green-500/30",
      dot: "bg-green-500",
    };
  };

  const status = getStatusColor(port.ship_count);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
      <div className="flex justify-between items-center">
        {/* Left: Port Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Anchor size={14} className="text-orange-400" />
            <span className="font-bold text-white">{port.name}</span>
          </div>
          <span className="text-xs text-slate-500 font-mono font-medium">
            {port.locode}
          </span>
        </div>

        {/* Right: Traffic Light + Count */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${status.text}`}>
            {port.ship_count} {port.ship_count === 1 ? "ship" : "ships"}
          </span>
          <div
            className={`w-3 h-3 rounded-full ${status.dot} animate-pulse`}
          ></div>
        </div>
      </div>
    </div>
  );
};
