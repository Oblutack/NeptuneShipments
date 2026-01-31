import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useGetPortScheduleQuery,
  useGetUnassignedVesselsQuery,
  useGetPortTerminalsQuery,
  useCreateAllocationMutation,
  type BerthAllocation,
  type Vessel,
  type Terminal,
  type Berth,
} from "../api/apiSlice";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import { Ship, Clock, Anchor } from "lucide-react";

export const BerthScheduler = () => {
  const { portId } = useParams<{ portId: string }>();
  const [activeVessel, setActiveVessel] = useState<Vessel | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBerth, setSelectedBerth] = useState<Berth | null>(null);
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(24);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const { data: scheduleData } = useGetPortScheduleQuery(
    { portId: portId! },
    { skip: !portId, pollingInterval: 10000 },
  );

  const { data: unassignedData } = useGetUnassignedVesselsQuery(undefined, {
    pollingInterval: 10000,
  });

  const { data: terminalsData } = useGetPortTerminalsQuery(portId!, {
    skip: !portId,
  });

  const [createAllocation, { isLoading }] = useCreateAllocationMutation();

  const handleDragStart = (event: DragStartEvent) => {
    const vessel = unassignedData?.vessels.find(
      (v) => v.id === event.active.id,
    );
    setActiveVessel(vessel || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;

    if (over && activeVessel) {
      const berthId = over.id as string;
      const berth = terminalsData?.terminals
        .flatMap((t) => t.berths)
        .find((b) => b.id === berthId);

      if (berth) {
        setSelectedBerth(berth);
        setShowModal(true);
      }
    }

    setActiveVessel(null);
  };

  const handleSubmitAllocation = async () => {
    if (!activeVessel || !selectedBerth || !startTime) return;

    try {
      await createAllocation({
        vessel_id: activeVessel.id,
        berth_id: selectedBerth.id,
        start_time: new Date(startTime).toISOString(),
        duration_hours: duration,
      }).unwrap();

      setShowModal(false);
      setSelectedBerth(null);
      setStartTime("");
      setDuration(24);
    } catch (error) {
      console.error("Failed to create allocation:", error);
      alert("Failed to schedule berth. Please try again.");
    }
  };

  if (!portId) {
    return <div>Port ID required</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-slate-950 text-white">
        {/* Sidebar - Unassigned Vessels */}
        <div className="w-80 bg-slate-900 border-r border-slate-700 p-4 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Ship size={20} />
            Unassigned Vessels
          </h2>

          {unassignedData?.vessels.map((vessel) => (
            <DraggableVessel key={vessel.id} vessel={vessel} />
          ))}
        </div>

        {/* Main Timeline Grid */}
        <div className="flex-1 p-6 overflow-auto">
          <h1 className="text-2xl font-bold mb-6">Berth Schedule</h1>

          {terminalsData?.terminals.map((terminal) => (
            <TerminalSchedule
              key={terminal.id}
              terminal={terminal}
              allocations={scheduleData?.allocations || []}
            />
          ))}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeVessel && (
          <div className="bg-blue-600 text-white p-3 rounded shadow-lg">
            {activeVessel.name}
          </div>
        )}
      </DragOverlay>

      {/* Allocation Modal */}
      {showModal && selectedBerth && activeVessel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Schedule Berth</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vessel</label>
                <p className="text-blue-400">{activeVessel.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Berth</label>
                <p className="text-green-400">{selectedBerth.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={1}
                  max={168}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSubmitAllocation}
                disabled={isLoading || !startTime}
                className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
              >
                {isLoading ? "Scheduling..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
};

// Sub-components

const DraggableVessel = ({ vessel }: { vessel: Vessel }) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: vessel.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="bg-slate-800 border border-slate-600 rounded p-3 mb-2 cursor-move hover:border-blue-500 transition"
    >
      <div className="flex items-center gap-2">
        <Ship size={16} className="text-blue-400" />
        <span className="font-medium">{vessel.name}</span>
      </div>
      <div className="text-xs text-slate-400 mt-1">
        {vessel.type} • {vessel.status}
      </div>
    </div>
  );
};

const TerminalSchedule = ({
  terminal,
  allocations,
}: {
  terminal: Terminal;
  allocations: BerthAllocation[];
}) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
        <Anchor size={18} className="text-orange-400" />
        {terminal.name}
      </h3>

      <div className="space-y-2">
        {terminal.berths.map((berth) => (
          <BerthRow
            key={berth.id}
            berth={berth}
            allocations={allocations.filter((a) => a.berth_id === berth.id)}
          />
        ))}
      </div>
    </div>
  );
};

const BerthRow = ({
  berth,
  allocations,
}: {
  berth: Berth;
  allocations: BerthAllocation[];
}) => {
  const { setNodeRef } = useDroppable({
    id: berth.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-slate-800 border border-slate-700 rounded-lg p-3 min-h-[60px] relative hover:border-blue-500/50 transition"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{berth.name}</span>
        <span className="text-xs text-slate-500">{berth.length_meters}m</span>
      </div>

      {/* Allocation Blocks */}
      <div className="flex gap-1">
        {allocations.map((allocation) => (
          <div
            key={allocation.id}
            className="bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
            title={`${allocation.vessel_name}: ${new Date(
              allocation.start_time,
            ).toLocaleString()}`}
          >
            <Clock size={10} />
            {allocation.vessel_name}
          </div>
        ))}
      </div>
    </div>
  );
};

// Import required hooks from @dnd-kit
import { useDraggable, useDroppable } from "@dnd-kit/core";
