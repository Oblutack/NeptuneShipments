import { useState, useMemo } from "react";
import {
  useGetCrewQuery,
  useGetVesselsQuery,
  useAssignCrewMutation,
} from "../../features/api/apiSlice";
import { VesselSelector } from "../../features/crew/VesselSelector";
import { CrewRoster } from "../../features/crew/CrewRoster";
import { Users, Loader2, X } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";

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
      <div className="flex items-center justify-center py-32 gap-3">
        <Loader2 className="animate-spin text-blue-400" size={28} />
        <span className="text-slate-400 font-medium">
          Loading crew roster...
        </span>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        icon={Users}
        title="Crew Management"
        subtitle="Personnel roster and vessel assignments"
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Personnel" value={crewData?.total || 0} />
        <StatCard
          label="Active Crew"
          value={
            crewData?.crew.filter((c) => c.status === "ACTIVE").length || 0
          }
        />
        <StatCard label="On Shore Leave" value={unassignedCount} />
        <StatCard
          label="Assigned to Fleet"
          value={
            crewData?.crew.filter((c) => c.vessel_id !== null).length || 0
          }
        />
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: Vessel Selector */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sticky top-4">
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
    </>
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">
            Assign to Vessel
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
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
}

const StatCard = ({ label, value }: StatCardProps) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-semibold text-white tabular-nums">
        {value}
      </p>
    </div>
  );
};
