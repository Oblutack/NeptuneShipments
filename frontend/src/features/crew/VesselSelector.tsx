import { Ship, Users } from "lucide-react";
import type { Vessel } from "../api/apiSlice";

interface VesselSelectorProps {
  vessels: Vessel[];
  selectedVesselId: string | null;
  unassignedCount: number;
  onSelectVessel: (vesselId: string | null) => void;
}

export const VesselSelector = ({
  vessels,
  selectedVesselId,
  unassignedCount,
  onSelectVessel,
}: VesselSelectorProps) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Ship size={20} className="text-blue-400" />
          Fleet Roster
        </h2>
        <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
          {vessels.length} vessels
        </span>
      </div>

      {/* Unassigned Crew Card (Shore Leave) */}
      <button
        onClick={() => onSelectVessel(null)}
        className={`w-full text-left p-4 rounded-xl transition-all duration-300 border-2 ${
          selectedVesselId === null
            ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500 shadow-lg shadow-amber-500/20"
            : "bg-slate-900/50 border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Users size={20} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white">Shore Leave</h3>
            <p className="text-xs text-slate-400">Unassigned Personnel</p>
          </div>
          <div className="bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold">
            {unassignedCount}
          </div>
        </div>
      </button>

      {/* Vessel Cards */}
      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
        {vessels.map((vessel) => {
          const isSelected = selectedVesselId === vessel.id;

          return (
            <button
              key={vessel.id}
              onClick={() => onSelectVessel(vessel.id)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 border-2 ${
                isSelected
                  ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500 shadow-lg shadow-blue-500/20"
                  : "bg-slate-900/50 border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? "bg-blue-500/20" : "bg-slate-800"
                  }`}
                >
                  <Ship
                    size={20}
                    className={isSelected ? "text-blue-400" : "text-slate-400"}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">
                    {vessel.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {vessel.imo_number}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full font-medium uppercase ${
                      vessel.status === "AT_SEA"
                        ? "bg-blue-500/20 text-blue-300"
                        : vessel.status === "DOCKED"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {vessel.status.replace("_", " ")}
                  </span>
                  <span className="text-slate-500">{vessel.type}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgb(15 23 42 / 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(71 85 105);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(100 116 139);
        }
      `}</style>
    </div>
  );
};
