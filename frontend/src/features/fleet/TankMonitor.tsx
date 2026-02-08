import { useGetTanksQuery } from "../api/apiSlice";
import { Loader2, Droplets, AlertTriangle } from "lucide-react";

interface TankMonitorProps {
  vesselId: string;
}

export const TankMonitor = ({ vesselId }: TankMonitorProps) => {
  const { data: tanks, isLoading } = useGetTanksQuery(vesselId);

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-400" size={28} />
        <span className="text-slate-300 font-medium">
          Scanning tank sensors...
        </span>
      </div>
    );
  }

  if (!tanks || tanks.length === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center">
        <div className="p-6 bg-slate-800/50 rounded-2xl inline-block mb-4">
          <AlertTriangle className="text-slate-600" size={48} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          No Liquid Storage Detected
        </h3>
        <p className="text-slate-400">
          This vessel may be a container ship without liquid cargo tanks
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Droplets className="text-cyan-400" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Liquid Cargo Tanks</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitor tank levels and cargo distribution
            </p>
          </div>
        </div>
      </div>

      {/* Tank Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tanks.map((tank) => {
          const percentage = (tank.current_level / tank.capacity_barrels) * 100;

          // Dynamic Color: Red if empty/full, Blue/Yellow/Green for liquid types
          const liquidColor =
            tank.cargo_type === "Crude Oil"
              ? "bg-gradient-to-t from-yellow-600 to-amber-500"
              : "bg-gradient-to-t from-blue-600 to-cyan-500";

          return (
            <div
              key={tank.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 relative overflow-hidden group hover:border-cyan-500/50 transition-all"
            >
              {/* Header */}
              <div className="relative z-10 flex justify-between items-center mb-6">
                <span className="text-sm font-bold text-white uppercase tracking-wide">
                  {tank.name}
                </span>
                {tank.is_filling && (
                  <div className="flex items-center gap-1 bg-blue-500/20 px-2 py-1 rounded-lg">
                    <Droplets
                      size={12}
                      className="text-blue-400 animate-bounce"
                    />
                    <span className="text-xs text-blue-400 font-bold">
                      FILLING
                    </span>
                  </div>
                )}
              </div>

              {/* Liquid Visual */}
              <div className="absolute bottom-0 left-0 w-full bg-slate-900/50 h-full"></div>
              <div
                className={`absolute bottom-0 left-0 w-full transition-all duration-1000 ${liquidColor}`}
                style={{ height: `${percentage}%` }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/30 shadow-lg"></div>
              </div>

              {/* Text Overlay */}
              <div className="relative z-10 text-center mt-8">
                <div className="text-3xl font-mono font-bold text-white drop-shadow-lg">
                  {percentage.toFixed(1)}
                  <span className="text-lg">%</span>
                </div>
                <div className="text-xs text-slate-300 mt-2 font-medium">
                  {tank.current_level.toLocaleString()} /{" "}
                  {tank.capacity_barrels.toLocaleString()} BBL
                </div>
                <div className="mt-3 inline-block bg-slate-900/70 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <div className="text-xs uppercase text-cyan-400 font-bold">
                    {tank.cargo_type}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
