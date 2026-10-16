import { useGetTanksQuery } from "../api/apiSlice";
import { Loader2, Droplets, AlertTriangle } from "lucide-react";

interface TankMonitorProps {
  vesselId: string;
}

export const TankMonitor = ({ vesselId }: TankMonitorProps) => {
  const { data: tanks, isLoading } = useGetTanksQuery(vesselId);

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-400" size={24} />
        <span className="text-slate-400 font-medium">
          Scanning tank sensors...
        </span>
      </div>
    );
  }

  if (!tanks || tanks.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
        <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-4">
          <AlertTriangle className="text-slate-600" size={40} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1.5">
          No Liquid Storage Detected
        </h3>
        <p className="text-slate-500 text-sm">
          This vessel may be a container ship without liquid cargo tanks
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Droplets className="text-slate-500" size={16} />
          <h3 className="text-sm font-semibold text-white">
            Liquid Cargo Tanks
          </h3>
        </div>
      </div>

      {/* Tank Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tanks.map((tank) => {
          const percentage = (tank.current_level / tank.capacity_barrels) * 100;

          const liquidColor =
            tank.cargo_type === "Crude Oil" ? "bg-amber-600" : "bg-blue-600";

          return (
            <div
              key={tank.id}
              className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative overflow-hidden"
            >
              {/* Header */}
              <div className="relative z-10 flex justify-between items-center mb-6">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  {tank.name}
                </span>
                {tank.is_filling && (
                  <div className="flex items-center gap-1 bg-blue-500/15 px-1.5 py-0.5 rounded">
                    <Droplets size={11} className="text-blue-400" />
                    <span className="text-[10px] text-blue-400 font-semibold">
                      FILLING
                    </span>
                  </div>
                )}
              </div>

              {/* Liquid Visual */}
              <div
                className={`absolute bottom-0 left-0 w-full transition-all duration-1000 opacity-25 ${liquidColor}`}
                style={{ height: `${percentage}%` }}
              />

              {/* Text Overlay */}
              <div className="relative z-10 text-center mt-8">
                <div className="text-2xl font-mono font-semibold text-white">
                  {percentage.toFixed(1)}
                  <span className="text-base">%</span>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {tank.current_level.toLocaleString()} /{" "}
                  {tank.capacity_barrels.toLocaleString()} BBL
                </div>
                <div className="mt-2.5 inline-block bg-slate-900 px-2.5 py-1 rounded">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">
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
