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
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Ship, Clock, Anchor } from "lucide-react";

interface RTKQueryError {
  status?: number;
  data?: {
    error?: string;
    message?: string;
  };
  error?: string;
  message?: string;
}

export const BerthScheduler = () => {
  const { portId } = useParams<{ portId: string }>();
  const [activeVessel, setActiveVessel] = useState<Vessel | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBerth, setSelectedBerth] = useState<Berth | null>(null);
  const [draggedVessel, setDraggedVessel] = useState<Vessel | null>(null); // ✅ Track dragged vessel separately
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(24);

  // ✅ Increase activation distance to prevent accidental triggers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 15, // Changed from 8 to 15 pixels
      },
    }),
  );

  const { data: scheduleData } = useGetPortScheduleQuery(
    { portId: portId! },
    { skip: !portId, pollingInterval: 10000 },
  );

  const { data: unassignedData, isLoading: isLoadingVessels } =
    useGetUnassignedVesselsQuery(undefined, {
      pollingInterval: 10000,
    });

  const { data: terminalsData, isLoading: isLoadingTerminals } =
    useGetPortTerminalsQuery(portId!, {
      skip: !portId,
    });

  const [createAllocation, { isLoading }] = useCreateAllocationMutation();

  const handleDragStart = (event: DragStartEvent) => {
    const vessel = unassignedData?.vessels.find(
      (v) => v.id === event.active.id,
    );
    setDraggedVessel(vessel || null); // ✅ Set dragged vessel
    console.log("Drag started:", vessel?.name); // Debug log
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;

    console.log("Drag ended. Over:", over?.id, "Vessel:", draggedVessel?.name); // Debug log

    if (over && draggedVessel) {
      const berthId = over.id as string;
      const berth = terminalsData?.terminals
        .flatMap((t) => t.berths)
        .find((b) => b.id === berthId);

      console.log("Found berth:", berth?.name); // Debug log

      if (berth) {
        setActiveVessel(draggedVessel); // ✅ Set active vessel for modal
        setSelectedBerth(berth);
        setShowModal(true);
      }
    }

    setDraggedVessel(null); // ✅ Clear dragged vessel
  };

  const handleDragCancel = () => {
    console.log("Drag cancelled"); // Debug log
    setDraggedVessel(null);
  };

  const handleSubmitAllocation = async () => {
    if (!activeVessel || !selectedBerth || !startTime) {
      alert("Please select a start time");
      return;
    }

    console.log("Submitting allocation:", {
      vessel_id: activeVessel.id,
      berth_id: selectedBerth.id,
      start_time: new Date(startTime).toISOString(),
      duration_hours: duration,
    });

    try {
      const result = await createAllocation({
        vessel_id: activeVessel.id,
        berth_id: selectedBerth.id,
        start_time: new Date(startTime).toISOString(),
        duration_hours: duration,
      }).unwrap();

      console.log("Allocation created successfully:", result);

      alert(
        `✅ Successfully scheduled ${activeVessel.name} at ${selectedBerth.name}`,
      );

      setShowModal(false);
      setActiveVessel(null);
      setSelectedBerth(null);
      setStartTime("");
      setDuration(24);
    } catch (err) {
      // ✅ Changed from 'error' to 'err'
      console.error("Failed to create allocation:", err);

      // ✅ Type assertion to RTKQueryError
      const error = err as RTKQueryError;

      // ✅ Safely extract error message
      const errorMessage =
        error?.data?.error ||
        error?.data?.message ||
        error?.message ||
        error?.error ||
        "Unknown error occurred";

      alert(`❌ Failed to schedule berth:\n\n${errorMessage}`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveVessel(null);
    setSelectedBerth(null);
    setStartTime("");
    setDuration(24);
  };

  if (!portId) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">Port ID Required</p>
          <p className="text-slate-400">Please select a port to continue</p>
        </div>
      </div>
    );
  }

  if (isLoadingVessels || isLoadingTerminals) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading berth schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel} // ✅ Add cancel handler
    >
      <div className="flex h-screen bg-slate-950 text-white">
        {/* Sidebar - Unassigned Vessels */}
        <div className="w-80 bg-slate-900 border-r border-slate-700 p-4 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Ship size={20} />
            Unassigned Vessels
          </h2>

          {isLoadingVessels ? (
            <div className="text-center py-8 text-slate-400">
              Loading vessels...
            </div>
          ) : unassignedData?.vessels && unassignedData.vessels.length > 0 ? (
            unassignedData.vessels.map((vessel) => (
              <DraggableVessel key={vessel.id} vessel={vessel} />
            ))
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Ship size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No unassigned vessels</p>
            </div>
          )}
        </div>

        {/* Main Timeline Grid */}
        <div className="flex-1 p-6 overflow-auto">
          <h1 className="text-2xl font-bold mb-6">Berth Schedule</h1>

          {isLoadingTerminals ? (
            <div className="text-center py-12 text-slate-400">
              Loading terminals...
            </div>
          ) : terminalsData?.terminals && terminalsData.terminals.length > 0 ? (
            terminalsData.terminals.map((terminal) => (
              <TerminalSchedule
                key={terminal.id}
                terminal={terminal}
                allocations={scheduleData?.allocations || []}
              />
            ))
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Anchor size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">No terminals found</p>
              <p className="text-sm">
                This port doesn't have any terminals configured yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Drag Overlay - Shows while dragging */}
      <DragOverlay>
        {draggedVessel && ( // ✅ Use draggedVessel instead of activeVessel
          <div className="bg-blue-600 text-white p-3 rounded shadow-lg cursor-grabbing">
            <div className="flex items-center gap-2">
              <Ship size={16} />
              <span className="font-medium">{draggedVessel.name}</span>
            </div>
          </div>
        )}
      </DragOverlay>

      {/* Allocation Modal - Shows after successful drop */}
      {/* Allocation Modal - Shows after successful drop */}
      {showModal && selectedBerth && activeVessel && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-slate-800 p-6 rounded-lg w-96 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Schedule Berth</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vessel</label>
                <p className="text-blue-400 font-semibold">
                  {activeVessel.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Berth</label>
                <p className="text-green-400 font-semibold">
                  {selectedBerth.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)} // ✅ Prevent past dates
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                {!startTime && (
                  <p className="text-xs text-red-400 mt-1">
                    Please select both date and time
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration (hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={1}
                    max={168}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-slate-400 text-sm">
                    ({Math.floor(duration / 24)}d {duration % 24}h)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  End:{" "}
                  {startTime &&
                    new Date(
                      new Date(startTime).getTime() + duration * 60 * 60 * 1000,
                    ).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSubmitAllocation}
                disabled={isLoading || !startTime}
                className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {isLoading ? "Scheduling..." : "Confirm"}
              </button>
              <button
                onClick={handleCloseModal}
                disabled={isLoading}
                className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded transition font-medium disabled:opacity-50"
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: vessel.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-slate-800 border border-slate-600 rounded p-3 mb-2 cursor-grab active:cursor-grabbing hover:border-blue-500 transition ${
        isDragging ? "opacity-50" : "" // ✅ Visual feedback while dragging
      }`}
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
        {terminal.berths && terminal.berths.length > 0 ? (
          terminal.berths.map((berth) => (
            <BerthRow
              key={berth.id}
              berth={berth}
              allocations={allocations.filter((a) => a.berth_id === berth.id)}
            />
          ))
        ) : (
          <p className="text-slate-500 text-sm">No berths available</p>
        )}
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
  const { setNodeRef, isOver } = useDroppable({
    id: berth.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-slate-800 border rounded-lg p-3 min-h-[60px] relative transition ${
        isOver
          ? "border-blue-500 bg-blue-900/20" // ✅ Visual feedback when hovering
          : "border-slate-700 hover:border-slate-600"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{berth.name}</span>
        <span className="text-xs text-slate-500">{berth.length_meters}m</span>
      </div>

      <div className="flex gap-1 flex-wrap">
        {allocations && allocations.length > 0 ? (
          allocations.map((allocation) => (
            <div
              key={allocation.id}
              className="bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
              title={`${allocation.vessel_name}: ${new Date(
                allocation.start_time,
              ).toLocaleString()}`}
            >
              <Clock size={10} />
              {allocation.vessel_name || "Unknown Vessel"}
            </div>
          ))
        ) : (
          <span className="text-xs text-slate-600">
            {isOver ? "Drop here to schedule" : "No allocations"}
          </span>
        )}
      </div>
    </div>
  );
};
