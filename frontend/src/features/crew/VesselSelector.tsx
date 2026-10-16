import { Ship, Users } from "lucide-react";
import type { Vessel } from "../api/apiSlice";
import { StatusBadge } from "../../components/ui/StatusBadge";

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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Ship size={15} className="text-slate-500" />
          Fleet Roster
        </h2>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
          {vessels.length}
        </span>
      </div>

      {/* Unassigned Crew Card (Shore Leave) */}
      <button
        onClick={() => onSelectVessel(null)}
        className={`w-full text-left p-3 rounded-md transition-colors border ${
          selectedVesselId === null
            ? "bg-amber-500/10 border-amber-500/40"
            : "bg-slate-950 border-slate-800 hover:border-slate-700"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Users size={16} className="text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm">Shore Leave</h3>
            <p className="text-xs text-slate-500">Unassigned Personnel</p>
          </div>
          <div className="text-amber-400 text-xs font-semibold tabular-nums">
            {unassignedCount}
          </div>
        </div>
      </button>

      {/* Vessel Cards */}
      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 custom-scrollbar">
        {vessels.map((vessel) => {
          const isSelected = selectedVesselId === vessel.id;

          return (
            <button
              key={vessel.id}
              onClick={() => onSelectVessel(vessel.id)}
              className={`w-full text-left p-3 rounded-md transition-colors border ${
                isSelected
                  ? "bg-blue-500/10 border-blue-500/40"
                  : "bg-slate-950 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <Ship size={16} className="text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white text-sm truncate">
                    {vessel.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {vessel.imo_number}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <StatusBadge status={vessel.status} />
                <span className="text-slate-500">{vessel.type}</span>
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
