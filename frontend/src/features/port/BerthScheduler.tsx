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
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";

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

  const [dateRange] = useState(() => {
    const now = Date.now();
    return {
      startDate: new Date(now - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      endDate: new Date(now + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    };
  });

  const { data: scheduleData } = useGetPortScheduleQuery(
    {
      portId: portId!,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
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
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={40} />
          <p className="text-lg font-semibold text-white mb-1.5">
            Port ID Required
          </p>
          <p className="text-slate-500 text-sm">
            Please select a port to continue
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingVessels || isLoadingTerminals) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <Loader2
            className="animate-spin text-blue-400 mx-auto mb-3"
            size={32}
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
      <PageHeader
        icon={Calendar}
        title="Berth Schedule"
        subtitle="Drag vessels to berths to schedule allocations"
        actions={
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                Unassigned
              </div>
              <div className="text-lg font-semibold text-white tabular-nums">
                {unassignedData?.count || 0}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                Terminals
              </div>
              <div className="text-lg font-semibold text-white tabular-nums">
                {terminalsData?.terminals.length || 0}
              </div>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Unassigned Vessels Panel */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden sticky top-4">
            <div className="border-b border-slate-800 p-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Ship size={16} className="text-slate-500" />
                Unassigned Vessels
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {unassignedData?.count || 0} waiting
              </p>
            </div>

            <div className="p-3 max-h-[calc(100vh-300px)] overflow-y-auto space-y-2">
              {isLoadingVessels ? (
                <div className="text-center py-12">
                  <Loader2
                    size={28}
                    className="animate-spin text-blue-400 mx-auto mb-3"
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
                  <div className="p-4 bg-slate-800/50 rounded-lg inline-block mb-4">
                    <Ship size={36} className="text-slate-600" />
                  </div>
                  <p className="text-slate-400 font-medium text-sm mb-1">
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

        {/* Terminal Schedule Grid */}
        <div className="lg:col-span-3 space-y-4">
          {isLoadingTerminals ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
              <Loader2
                size={32}
                className="animate-spin text-blue-400 mx-auto mb-3"
              />
              <p className="text-slate-400 text-sm">Loading terminals...</p>
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
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-16 text-center">
              <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-5">
                <Anchor size={48} className="text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1.5">
                No Terminals Available
              </h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                This port doesn't have any terminals configured yet. Contact
                administration to set up port infrastructure.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedVessel && (
          <div className="bg-blue-600 text-white p-3.5 rounded-lg shadow-xl cursor-grabbing transform scale-105">
            <div className="flex items-center gap-2.5">
              <Ship size={18} />
              <div>
                <div className="font-medium text-sm">{draggedVessel.name}</div>
                <div className="text-xs opacity-80">{draggedVessel.type}</div>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>

      {/* Allocation Modal */}
      {showModal && selectedBerth && activeVessel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl border border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Calendar size={18} className="text-slate-500" />
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Schedule Berth
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Assign vessel to berth slot
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isLoading}
                className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {/* Vessel Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
                  <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1.5 font-medium">
                    Vessel
                  </label>
                  <div className="flex items-center gap-2">
                    <Ship size={16} className="text-blue-400" />
                    <p className="text-white font-medium text-sm">
                      {activeVessel.name}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeVessel.type}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
                  <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1.5 font-medium">
                    Berth
                  </label>
                  <div className="flex items-center gap-2">
                    <Anchor size={16} className="text-orange-400" />
                    <p className="text-white font-medium text-sm">
                      {selectedBerth.name}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedBerth.length_meters}m length
                  </p>
                </div>
              </div>

              {/* Time Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Start Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Duration
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      min={1}
                      max={168}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-300 font-medium min-w-[110px] text-center tabular-nums">
                      {Math.floor(duration / 24)}d {duration % 24}h
                    </div>
                  </div>
                  {startTime && (
                    <div className="mt-3 bg-slate-950 border border-slate-800 rounded-md p-3 flex items-start gap-2">
                      <Clock
                        size={15}
                        className="text-slate-500 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-xs text-slate-500 font-medium">
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
                className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-md font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAllocation}
                disabled={isLoading || !startTime}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
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

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-slate-950 border border-slate-800 rounded-lg p-3.5 cursor-grab active:cursor-grabbing hover:border-slate-700 transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Ship size={16} className="text-slate-500" />
        <span className="font-medium text-white text-sm">{vessel.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">{vessel.type}</span>
        <StatusBadge status={vessel.status} />
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Anchor size={16} className="text-slate-500" />
          <div>
            <h3 className="text-sm font-semibold text-white">
              {terminal.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {availableBerths} available &bull; {occupiedBerths} occupied
              &bull; {totalBerths} total
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
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
      className={`bg-slate-950 border rounded-lg p-3.5 min-h-[76px] transition-colors ${
        isOver ? "border-blue-500 bg-blue-500/5" : "border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${hasAllocations ? "bg-red-500" : "bg-emerald-500"}`}
          ></div>
          <span className="font-medium text-white text-sm">{berth.name}</span>
        </div>
        <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-slate-900 rounded tabular-nums">
          {berth.length_meters}m
        </span>
      </div>

      <div className="space-y-2">
        {hasAllocations ? (
          allocations.map((allocation) => (
            <div
              key={allocation.id}
              className="bg-blue-500/10 border border-blue-500/20 rounded-md p-2.5"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Ship size={13} className="text-blue-400" />
                  <span className="text-sm font-medium text-white">
                    {allocation.vessel_name || "Unknown Vessel"}
                  </span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                    allocation.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : allocation.status === "SCHEDULED"
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {allocation.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={11} />
                <span>
                  {new Date(allocation.start_time).toLocaleString()} &rarr;{" "}
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
                  <Ship size={15} />
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
