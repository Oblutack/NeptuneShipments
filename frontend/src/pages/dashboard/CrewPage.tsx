import { useState, useMemo } from "react";
import {
  useGetCrewQuery,
  useGetVesselsQuery,
  useAssignCrewMutation,
} from "../../features/api/apiSlice";
import { VesselSelector } from "../../features/crew/VesselSelector";
import { CrewRoster } from "../../features/crew/CrewRoster";
import { Users, Loader2, X } from "lucide-react";

export const CrewPage = () => {
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);

  const { data: crewData, isLoading: crewLoading } = useGetCrewQuery(
    undefined,
    {
      pollingInterval: 5000,
    },
  );

  const { data: vessels, isLoading: vesselsLoading } = useGetVesselsQuery(
    undefined,
    {
      pollingInterval: 5000,
    },
  );

  // Filter crew based on selection
  const filteredCrew = useMemo(() => {
    if (!crewData?.crew) return [];

    if (selectedVesselId === null) {
      // Show unassigned crew
      return crewData.crew.filter((member) => member.vessel_id === null);
    } else {
      // Show crew for selected vessel
      return crewData.crew.filter(
        (member) => member.vessel_id === selectedVesselId,
      );
    }
  }, [crewData, selectedVesselId]);

  // Count unassigned crew
  const unassignedCount = useMemo(() => {
    return (
      crewData?.crew.filter((member) => member.vessel_id === null).length || 0
    );
  }, [crewData]);

  // Get vessel name for header
  const selectedVesselName = useMemo(() => {
    if (!selectedVesselId || !vessels) return null;
    return vessels.find((v) => v.id === selectedVesselId)?.name || null;
  }, [selectedVesselId, vessels]);

  const [assignCrew] = useAssignCrewMutation();
  const [assignModalCrewId, setAssignModalCrewId] = useState<string | null>(
    null,
  );

  // Assign and transfer are the same action (pick a vessel, assign into
  // it) - both just open the same picker modal.
  const handleAssign = (crewId: string) => setAssignModalCrewId(crewId);
  const handleTransfer = (crewId: string) => setAssignModalCrewId(crewId);

  const handleRemove = (crewId: string) => {
    assignCrew({ crewId, vesselId: null });
  };

  if (crewLoading || vesselsLoading) {
    return (
      <div className="flex items-center justify-center h-screen gap-3">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="text-slate-400 text-lg">Loading crew roster...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl shadow-lg shadow-cyan-500/20">
            <Users className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Crew Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Personnel roster and vessel assignments
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Personnel"
            value={crewData?.total || 0}
            color="blue"
          />
          <StatCard
            label="Active Crew"
            value={
              crewData?.crew.filter((c) => c.status === "ACTIVE").length || 0
            }
            color="green"
          />
          <StatCard
            label="On Shore Leave"
            value={unassignedCount}
            color="amber"
          />
          <StatCard
            label="Assigned to Fleet"
            value={
              crewData?.crew.filter((c) => c.vessel_id !== null).length || 0
            }
            color="purple"
          />
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left: Vessel Selector */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 sticky top-8 shadow-2xl">
              <VesselSelector
                vessels={vessels || []}
                selectedVesselId={selectedVesselId}
                unassignedCount={unassignedCount}
                onSelectVessel={setSelectedVesselId}
              />
            </div>
          </div>

          {/* Right: Crew Roster */}
          <div className="lg:col-span-3">
            <CrewRoster
              crew={filteredCrew}
              vesselName={selectedVesselName}
              onAssign={handleAssign}
              onTransfer={handleTransfer}
              onRemove={handleRemove}
            />
          </div>
        </div>
      </div>

      {assignModalCrewId && (
        <AssignVesselModal
          vessels={vessels || []}
          onClose={() => setAssignModalCrewId(null)}
          onConfirm={(vesselId) => {
            assignCrew({ crewId: assignModalCrewId, vesselId });
            setAssignModalCrewId(null);
          }}
        />
      )}
    </div>
  );
};

interface AssignVesselModalProps {
  vessels: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: (vesselId: string) => void;
}

const AssignVesselModal = ({
  vessels,
  onClose,
  onConfirm,
}: AssignVesselModalProps) => {
  const [selected, setSelected] = useState(vessels[0]?.id || "");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Assign to Vessel</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {vessels.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: number;
  color: "blue" | "green" | "amber" | "purple";
}

const StatCard = ({ label, value, color }: StatCardProps) => {
  const colorClasses = {
    blue: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
    green:
      "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400",
    amber:
      "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400",
    purple:
      "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-xl border rounded-xl p-6 shadow-xl`}
    >
      <p className="text-xs uppercase tracking-wider mb-2 opacity-70">
        {label}
      </p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};
