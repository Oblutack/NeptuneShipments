import {
  useGetPortTerminalsQuery,
  type Port,
  type Terminal,
  type Berth,
} from "../api/apiSlice";
import {
  Loader2,
  X,
  Anchor,
  Container,
  Ship,
  MapPin,
  Building,
} from "lucide-react";

interface PortInspectorProps {
  port: Port;
  onClose: () => void;
}

export const PortInspector = ({ port, onClose }: PortInspectorProps) => {
  const { data, isLoading, error } = useGetPortTerminalsQuery(port.id);

  return (
    <div
      className="absolute top-4 right-4 bottom-4 z-20 w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-right-4 flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="bg-linear-to-r from-orange-900/30 to-slate-900 border-b border-slate-700 p-4 shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Anchor className="text-orange-400" size={20} />
              <h3 className="text-lg font-bold text-white">
                Port Infrastructure
              </h3>
            </div>
            <p className="text-sm text-slate-300 font-semibold">{port.name}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <MapPin size={12} />
              <span>{port.un_locode}</span>
              <span className="text-slate-700">|</span>
              <span>{port.country}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className="p-4 h-full overflow-y-auto"
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="animate-spin text-blue-400" size={24} />
              <span className="text-slate-400">Loading terminals...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-200">
              <p className="font-bold mb-1">Failed to load infrastructure</p>
              <p className="text-sm text-red-400">Please try again later</p>
            </div>
          )}

          {/* Empty State */}
          {data && data.terminals.length === 0 && (
            <div className="text-center py-8">
              <Building className="mx-auto mb-3 text-slate-600" size={40} />
              <p className="text-slate-400 font-semibold mb-1">
                No Infrastructure Data
              </p>
              <p className="text-xs text-slate-600">
                This port has no registered terminals
              </p>
            </div>
          )}

          {/* Terminals List */}
          {data && data.terminals.length > 0 && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Terminals</p>
                  <p className="text-2xl font-bold text-white">
                    {data.terminal_count}
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Total Berths</p>
                  <p className="text-2xl font-bold text-white">
                    {data.terminals.reduce(
                      (sum, t) => sum + t.berths.length,
                      0,
                    )}
                  </p>
                </div>
              </div>

              {/* Terminal Cards */}
              {data.terminals.map((terminal) => (
                <TerminalCard key={terminal.id} terminal={terminal} />
              ))}
            </div>
          )}
        </div>
        {/* Fade gradient to indicate more content */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-slate-900 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

// Terminal Card Sub-Component
const TerminalCard = ({ terminal }: { terminal: Terminal }) => {
  const occupiedCount = terminal.berths.filter((b) => b.is_occupied).length;
  const totalBerths = terminal.berths.length;
  const occupancyRate =
    totalBerths > 0 ? (occupiedCount / totalBerths) * 100 : 0;

  // Terminal type icon
  const getTerminalIcon = () => {
    switch (terminal.type) {
      case "CONTAINER":
        return <Container size={16} className="text-blue-400" />;
      case "LIQUID":
        return <Ship size={16} className="text-purple-400" />;
      default:
        return <Building size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
      {/* Terminal Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTerminalIcon()}
            <h4 className="font-bold text-white text-sm">{terminal.name}</h4>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              terminal.type === "CONTAINER"
                ? "bg-blue-900/30 text-blue-300 border border-blue-500/30"
                : terminal.type === "LIQUID"
                  ? "bg-purple-900/30 text-purple-300 border border-purple-500/30"
                  : "bg-slate-700 text-slate-300"
            }`}
          >
            {terminal.type}
          </span>
        </div>

        {/* Occupancy Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Occupancy</span>
            <span className="font-mono">
              {occupiedCount}/{totalBerths}
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                occupancyRate > 80
                  ? "bg-red-500"
                  : occupancyRate > 50
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Berths Grid */}
      <div className="p-3 grid grid-cols-3 gap-2">
        {terminal.berths.map((berth) => (
          <BerthCard key={berth.id} berth={berth} />
        ))}
      </div>
    </div>
  );
};

// Berth Card Sub-Component
const BerthCard = ({ berth }: { berth: Berth }) => {
  return (
    <div
      className={`rounded-lg p-2 border text-center transition-all ${
        berth.is_occupied
          ? "bg-red-900/20 border-red-500/50 hover:border-red-500"
          : "bg-green-900/20 border-green-500/50 hover:border-green-500"
      }`}
    >
      <p className="text-[10px] font-bold text-white mb-1">{berth.name}</p>
      <div
        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
          berth.is_occupied
            ? "bg-red-500/30 text-red-200"
            : "bg-green-500/30 text-green-200"
        }`}
      >
        {berth.is_occupied ? "OCCUPIED" : "OPEN"}
      </div>
      {berth.is_occupied && berth.current_vessel_id && (
        <div className="flex items-center justify-center gap-1 mt-1">
          <Ship size={8} className="text-red-400" />
          <span className="text-[8px] text-slate-500 font-mono truncate">
            {berth.current_vessel_id.slice(0, 8)}
          </span>
        </div>
      )}
      <p className="text-[8px] text-slate-600 mt-1">{berth.length_meters}m</p>
    </div>
  );
};
