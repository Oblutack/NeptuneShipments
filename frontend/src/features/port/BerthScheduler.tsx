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
import {
  Ship,
  Clock,
  Anchor,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

export const BerthScheduler = () => {
  const { portId } = useParams<{ portId: string }>();
  const [activeVessel, setActiveVessel] = useState<Vessel | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBerth, setSelectedBerth] = useState<Berth | null>(null);
  const [draggedVessel, setDraggedVessel] = useState<Vessel | null>(null);
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(24);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 15,
      },
    }),
  );

  const { data: scheduleData } = useGetPortScheduleQuery(
    {
      portId: portId!,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 7 days ago
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 30 days ahead
    },
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
    setDraggedVessel(vessel || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;

    if (over && draggedVessel) {
      const berthId = over.id as string;
      const berth = terminalsData?.terminals
        .flatMap((t) => t.berths)
        .find((b) => b.id === berthId);

      if (berth) {
        setActiveVessel(draggedVessel);
        setSelectedBerth(berth);
        setShowModal(true);
      }
    }

    setDraggedVessel(null);
  };

  const handleDragCancel = () => {
    setDraggedVessel(null);
  };

  const handleSubmitAllocation = async () => {
    if (!activeVessel || !selectedBerth || !startTime) {
      return;
    }

    try {
      await createAllocation({
        vessel_id: activeVessel.id,
        berth_id: selectedBerth.id,
        start_time: new Date(startTime).toISOString(),
        duration_hours: duration,
      }).unwrap();

      setShowModal(false);
      setActiveVessel(null);
      setSelectedBerth(null);
      setStartTime("");
      setDuration(24);
    } catch (err) {
      console.error("Failed to create allocation:", err);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <p className="text-xl font-bold text-white mb-2">Port ID Required</p>
          <p className="text-slate-400">Please select a port to continue</p>
        </div>
      </div>
    );
  }

  if (isLoadingVessels || isLoadingTerminals) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="animate-spin text-blue-500 mx-auto mb-4"
            size={48}
          />
          <p className="text-slate-400 font-medium">
            Loading berth schedule...
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
        <div className="max-w-[1800px] mx-auto space-y-8">
          {/* ✨ Modern Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg shadow-orange-500/20">
                <Calendar className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Berth Schedule
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Drag vessels to berths to schedule allocations
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl px-6 py-3">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                  Unassigned
                </div>
                <div className="text-2xl font-bold text-white">
                  {unassignedData?.count || 0}
                </div>
              </div>
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl px-6 py-3">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                  Terminals
                </div>
                <div className="text-2xl font-bold text-white">
                  {terminalsData?.terminals.length || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* ✨ Unassigned Vessels Panel */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden shadow-2xl sticky top-8">
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-slate-800 p-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <Ship size={24} className="text-blue-400" />
                    Unassigned Vessels
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {unassignedData?.count || 0} waiting
                  </p>
                </div>

                <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto space-y-3">
                  {isLoadingVessels ? (
                    <div className="text-center py-12">
                      <Loader2
                        size={32}
                        className="animate-spin text-blue-500 mx-auto mb-3"
                      />
                      <p className="text-slate-500 text-sm">
                        Loading vessels...
                      </p>
                    </div>
                  ) : unassignedData?.vessels &&
                    unassignedData.vessels.length > 0 ? (
                    unassignedData.vessels.map((vessel) => (
                      <DraggableVessel key={vessel.id} vessel={vessel} />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="p-4 bg-slate-800/50 rounded-2xl inline-block mb-4">
                        <Ship size={40} className="text-slate-600" />
                      </div>
                      <p className="text-slate-400 font-medium mb-1">
                        All vessels assigned
                      </p>
                      <p className="text-xs text-slate-500">
                        No unassigned vessels at this time
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ✨ Terminal Schedule Grid */}
            <div className="lg:col-span-3 space-y-6">
              {isLoadingTerminals ? (
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-12 text-center">
                  <Loader2
                    size={48}
                    className="animate-spin text-orange-500 mx-auto mb-4"
                  />
                  <p className="text-slate-400">Loading terminals...</p>
                </div>
              ) : terminalsData?.terminals &&
                terminalsData.terminals.length > 0 ? (
                terminalsData.terminals.map((terminal) => (
                  <TerminalSchedule
                    key={terminal.id}
                    terminal={terminal}
                    allocations={scheduleData?.allocations || []}
                  />
                ))
              ) : (
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-16 text-center">
                  <div className="p-6 bg-slate-800/50 rounded-2xl inline-block mb-6">
                    <Anchor size={64} className="text-slate-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    No Terminals Available
                  </h3>
                  <p className="text-slate-400 max-w-md mx-auto">
                    This port doesn't have any terminals configured yet. Contact
                    administration to set up port infrastructure.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedVessel && (
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 rounded-xl shadow-2xl cursor-grabbing transform scale-105">
            <div className="flex items-center gap-3">
              <Ship size={20} />
              <div>
                <div className="font-bold">{draggedVessel.name}</div>
                <div className="text-xs opacity-90">{draggedVessel.type}</div>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>

      {/* ✨ Modern Allocation Modal */}
      {showModal && selectedBerth && activeVessel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Calendar size={24} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    Schedule Berth
                  </h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Assign vessel to berth slot
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isLoading}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              {/* Vessel Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <label className="block text-xs uppercase tracking-wide text-blue-400 mb-2 font-semibold">
                    Vessel
                  </label>
                  <div className="flex items-center gap-2">
                    <Ship size={18} className="text-blue-400" />
                    <p className="text-white font-bold">{activeVessel.name}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeVessel.type}
                  </p>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <label className="block text-xs uppercase tracking-wide text-orange-400 mb-2 font-semibold">
                    Berth
                  </label>
                  <div className="flex items-center gap-2">
                    <Anchor size={18} className="text-orange-400" />
                    <p className="text-white font-bold">{selectedBerth.name}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedBerth.length_meters}m length
                  </p>
                </div>
              </div>

              {/* Time Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Start Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  {!startTime && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Please select both date and time
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Duration
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      min={1}
                      max={168}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 font-medium min-w-[120px] text-center">
                      {Math.floor(duration / 24)}d {duration % 24}h
                    </div>
                  </div>
                  {startTime && (
                    <div className="mt-3 bg-slate-800/50 rounded-lg p-3 flex items-start gap-2">
                      <Clock
                        size={16}
                        className="text-slate-400 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-xs text-slate-400 font-medium">
                          Estimated End
                        </p>
                        <p className="text-sm text-white mt-0.5">
                          {new Date(
                            new Date(startTime).getTime() +
                              duration * 60 * 60 * 1000,
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 border-t border-slate-800">
              <button
                onClick={handleCloseModal}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAllocation}
                disabled={isLoading || !startTime}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Confirm Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
};

// ========================================
// SUB-COMPONENTS
// ========================================

const DraggableVessel = ({ vessel }: { vessel: Vessel }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: vessel.id,
  });

  const statusColors = {
    AT_SEA: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    DOCKED: "bg-green-500/20 text-green-300 border-green-500/30",
    ANCHORED: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    MAINTENANCE: "bg-red-500/20 text-red-300 border-red-500/30",
    DISTRESS: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 ${
        isDragging ? "opacity-50 scale-95" : "hover:scale-[1.02]"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Ship size={18} className="text-blue-400" />
          <span className="font-bold text-white">{vessel.name}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{vessel.type}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase border ${statusColors[vessel.status as keyof typeof statusColors] || "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}
        >
          {vessel.status.replace("_", " ")}
        </span>
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
  const totalBerths = terminal.berths?.length || 0;
  const occupiedBerths =
    terminal.berths?.filter((berth) =>
      allocations.some((a) => a.berth_id === berth.id && a.status === "ACTIVE"),
    ).length || 0;
  const availableBerths = totalBerths - occupiedBerths;

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-slate-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Anchor size={24} className="text-orange-400" />
            <div>
              <h3 className="text-xl font-bold text-white">{terminal.name}</h3>
              <p className="text-sm text-slate-400 mt-0.5">
                {availableBerths} available • {occupiedBerths} occupied •{" "}
                {totalBerths} total
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {terminal.berths && terminal.berths.length > 0 ? (
          terminal.berths.map((berth) => (
            <BerthRow
              key={berth.id}
              berth={berth}
              allocations={allocations.filter((a) => a.berth_id === berth.id)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No berths configured for this terminal</p>
          </div>
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

  const hasAllocations = allocations && allocations.length > 0;

  return (
    <div
      ref={setNodeRef}
      className={`bg-slate-800/50 backdrop-blur border rounded-xl p-4 min-h-[80px] transition-all duration-200 ${
        isOver
          ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20 scale-[1.02]"
          : "border-slate-700 hover:border-slate-600"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${hasAllocations ? "bg-red-500" : "bg-green-500"}`}
          ></div>
          <span className="font-bold text-white">{berth.name}</span>
        </div>
        <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-900/50 rounded">
          {berth.length_meters}m
        </span>
      </div>

      <div className="space-y-2">
        {hasAllocations ? (
          allocations.map((allocation) => (
            <div
              key={allocation.id}
              className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Ship size={14} className="text-blue-400" />
                  <span className="text-sm font-bold text-white">
                    {allocation.vessel_name || "Unknown Vessel"}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                    allocation.status === "ACTIVE"
                      ? "bg-green-500/20 text-green-300 border border-green-500/30"
                      : allocation.status === "SCHEDULED"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                  }`}
                >
                  {allocation.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={12} />
                <span>
                  {new Date(allocation.start_time).toLocaleString()} →{" "}
                  {new Date(allocation.end_time).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-slate-500">
              {isOver ? (
                <span className="text-blue-400 font-medium flex items-center justify-center gap-2">
                  <Ship size={16} />
                  Drop vessel here to schedule
                </span>
              ) : (
                "No allocations • Available"
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
