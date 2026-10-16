import { useState, useEffect } from "react";
import {
  Search,
  Globe,
  Package,
  MapPin,
  Calendar,
  Ship,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  useLazyGetShipmentByTrackingQuery,
  useGetVesselByIdQuery,
} from "../features/api/apiSlice";
import { GlobalMap } from "../features/map/GlobalMap";
import { useSearchParams } from "react-router-dom";
import { StatusBadge } from "../components/ui/StatusBadge";

export const TrackingPage = () => {
  const [searchParams] = useSearchParams();
  const [trackId, setTrackId] = useState(searchParams.get("id") || "");

  // 1. The Search Trigger
  const [
    triggerSearch,
    { data: shipment, isLoading: loadingShipment, isError },
  ] = useLazyGetShipmentByTrackingQuery();

  // 2. The Vessel Fetch (Only runs if we found a shipment with a vessel_id)
  const { data: vessel } = useGetVesselByIdQuery(shipment?.vessel_id || "", {
    skip: !shipment?.vessel_id, // Don't run if no shipment found yet
  });

  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) {
      triggerSearch(idFromUrl);
    }
  }, [searchParams, triggerSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackId.trim()) {
      triggerSearch(trackId.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-4">
      {/* Header / Search Section */}
      <div className="w-full max-w-4xl mx-auto mt-10 text-center space-y-6">
        <div className="flex justify-center items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-lg">
            <Globe className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Neptune Tracking
          </h1>
        </div>

        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 mx-auto max-w-2xl">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Enter Tracking Number (e.g., TRK-TEST-01)"
              className="w-full bg-slate-950 border border-slate-700 rounded-md py-3.5 pl-11 pr-28 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
            />
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-md transition-colors font-medium text-sm"
            >
              {loadingShipment ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                "Track"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="max-w-2xl mx-auto mt-6 w-full bg-slate-900 border-l-2 border-red-500 p-4 rounded-lg flex items-center gap-3 text-red-300">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">
            Shipment not found. Please check your tracking number.
          </span>
        </div>
      )}

      {/* RESULT SECTION */}
      {shipment && (
        <div className="w-full max-w-6xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: Shipment Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 h-fit">
            <div className="flex items-center gap-2.5 mb-5 border-b border-slate-800 pb-4">
              <Package size={20} className="text-slate-500" />
              <div>
                <h2 className="text-base font-semibold text-white">
                  {shipment.tracking_number}
                </h2>
                <p className="text-slate-500 text-sm">
                  Customer: {shipment.customer_name}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1.5 font-medium">
                    ORIGIN
                  </p>
                  <div className="flex items-center gap-1.5 text-slate-200 font-mono text-sm font-medium">
                    <MapPin size={14} className="text-slate-500" />
                    {shipment.origin_port_name || shipment.origin_port_id}
                  </div>
                </div>
                <ArrowRight className="text-slate-600" size={18} />
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1.5 font-medium">
                    DESTINATION
                  </p>
                  <div className="flex items-center gap-1.5 text-slate-200 font-mono text-sm font-medium">
                    <MapPin size={14} className="text-slate-500" />
                    {shipment.destination_port_name ||
                      shipment.destination_port_id}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 rounded-lg p-3.5 space-y-2.5 border border-slate-800">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-500">Status</span>
                  <StatusBadge status={shipment.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Weight</span>
                  <span className="text-white tabular-nums">
                    {shipment.weight_kg} kg
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Container</span>
                  <span className="text-white font-mono">
                    {shipment.container_number || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Live Map (Spans 2 columns) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="h-[400px]">
              {/* Reuse GlobalMap but pass only THIS vessel */}
              {vessel && vessel.latitude ? (
                <GlobalMap vessels={[vessel]} ports={[]} />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <div className="p-5 bg-slate-800/50 rounded-lg">
                    <Ship size={40} />
                  </div>
                  <p className="text-sm font-medium">
                    Awaiting Vessel Assignment...
                  </p>
                </div>
              )}
            </div>

            {/* Vessel Info Bar */}
            {vessel && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2.5">
                  <Ship size={18} className="text-blue-400" />
                  <span className="text-sm">
                    Carried by{" "}
                    <b className="text-white font-medium">{vessel.name}</b>{" "}
                    <span className="text-slate-500">
                      ({vessel.imo_number})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={15} className="text-slate-500" />
                  <span className="text-slate-400">
                    ETA:{" "}
                    <span className="text-white font-medium">
                      {shipment.eta
                        ? new Date(shipment.eta).toLocaleString()
                        : "Calculating..."}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
