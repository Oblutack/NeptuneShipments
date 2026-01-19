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
    <div className="min-h-screen bg-slate-950 flex flex-col p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-10 pointer-events-none"></div>

      {/* Header / Search Section */}
      <div className="relative z-10 w-full max-w-4xl mx-auto mt-10 text-center space-y-8">
        <div className="flex justify-center items-center gap-3">
          <Globe className="text-blue-500 w-12 h-12" />
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Neptune Tracking
          </h1>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-2xl mx-auto max-w-xl">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Enter Tracking Number (e.g., TRK-TEST-01)"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
            />
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={20}
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-md transition-colors font-bold"
            >
              {loadingShipment ? <Loader2 className="animate-spin" /> : "Track"}
            </button>
          </form>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="max-w-xl mx-auto mt-8 w-full bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-200">
          <AlertCircle />
          <span>Shipment not found. Please check your tracking number.</span>
        </div>
      )}

      {/* RESULT SECTION */}
      {shipment && (
        <div className="relative z-10 w-full max-w-6xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Shipment Details */}
          <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-6 shadow-xl h-fit">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
              <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                <Package size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {shipment.tracking_number}
                </h2>
                <p className="text-slate-400 text-sm">
                  Customer: {shipment.customer_name}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">ORIGIN</p>
                  <div className="flex items-center gap-1 text-slate-200 font-mono">
                    <MapPin size={14} className="text-orange-500" />
                    {shipment.origin_port_name || shipment.origin_port_id}
                  </div>
                </div>
                <ArrowRight className="text-slate-600" />
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">DESTINATION</p>
                  <div className="flex items-center gap-1 text-slate-200 font-mono">
                    <MapPin size={14} className="text-orange-500" />
                    {shipment.destination_port_name ||
                      shipment.destination_port_id}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className="text-green-400 font-bold">
                    {shipment.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Weight</span>
                  <span className="text-white">{shipment.weight_kg} kg</span>
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
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-1 shadow-xl overflow-hidden h-[400px]">
              {/* Reuse GlobalMap but pass only THIS vessel */}
              {vessel && vessel.latitude ? (
                <GlobalMap vessels={[vessel]} ports={[]} />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-2">
                  <Ship size={40} />
                  <p>Awaiting Vessel Assignment...</p>
                </div>
              )}
            </div>

            {/* Vessel Info Bar */}
            {vessel && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between text-blue-100">
                <div className="flex items-center gap-3">
                  <Ship />
                  <span>
                    Carried by <b>{vessel.name}</b> ({vessel.imo_number})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} />
                  <span>
                    ETA:{" "}
                    {shipment.eta
                      ? new Date(shipment.eta).toLocaleString()
                      : "Calculating..."}
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
