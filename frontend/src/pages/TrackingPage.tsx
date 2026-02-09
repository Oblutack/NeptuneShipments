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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-5 pointer-events-none"></div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>

      {/* Header / Search Section */}
      <div className="relative z-10 w-full max-w-4xl mx-auto mt-10 text-center space-y-8">
        <div className="flex justify-center items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/30">
            <Globe className="text-white w-10 h-10" />
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Neptune Tracking
          </h1>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl mx-auto max-w-2xl">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Enter Tracking Number (e.g., TRK-TEST-01)"
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-5 pl-14 pr-32 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-base"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
            />
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"
              size={22}
            />
            <button
              type="submit"
              className="absolute right-3 top-3 bottom-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-8 rounded-lg transition-all font-bold shadow-lg shadow-blue-500/30"
            >
              {loadingShipment ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Track"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="max-w-2xl mx-auto mt-8 w-full bg-red-500/10 backdrop-blur-xl border border-red-500/50 p-5 rounded-2xl flex items-center gap-3 text-red-200 shadow-lg relative z-10">
          <AlertCircle size={24} />
          <span className="font-medium">
            Shipment not found. Please check your tracking number.
          </span>
        </div>
      )}

      {/* RESULT SECTION */}
      {shipment && (
        <div className="relative z-10 w-full max-w-6xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Shipment Details */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl h-fit">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/30">
                <Package size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {shipment.tracking_number}
                </h2>
                <p className="text-slate-400 text-sm font-medium">
                  Customer: {shipment.customer_name}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-2 font-bold">
                    ORIGIN
                  </p>
                  <div className="flex items-center gap-1.5 text-slate-200 font-mono font-semibold">
                    <MapPin size={16} className="text-orange-400" />
                    {shipment.origin_port_name || shipment.origin_port_id}
                  </div>
                </div>
                <ArrowRight className="text-slate-600" size={20} />
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-2 font-bold">
                    DESTINATION
                  </p>
                  <div className="flex items-center gap-1.5 text-slate-200 font-mono font-semibold">
                    <MapPin size={16} className="text-orange-400" />
                    {shipment.destination_port_name ||
                      shipment.destination_port_id}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-xl p-4 space-y-3 border border-slate-800">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-medium">Status</span>
                  <span className="text-green-400 font-bold bg-green-900/20 px-3 py-1 rounded-lg border border-green-500/30">
                    {shipment.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-medium">Weight</span>
                  <span className="text-white font-semibold">
                    {shipment.weight_kg} kg
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-medium">Container</span>
                  <span className="text-white font-mono font-semibold">
                    {shipment.container_number || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Live Map (Spans 2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-1 shadow-2xl overflow-hidden h-[400px]">
              {/* Reuse GlobalMap but pass only THIS vessel */}
              {vessel && vessel.latitude ? (
                <GlobalMap vessels={[vessel]} ports={[]} />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-3">
                  <div className="p-6 bg-slate-800/50 rounded-2xl">
                    <Ship size={48} />
                  </div>
                  <p className="font-medium">Awaiting Vessel Assignment...</p>
                </div>
              )}
            </div>

            {/* Vessel Info Bar */}
            {vessel && (
              <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-2xl p-5 flex items-center justify-between text-blue-100 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Ship size={20} />
                  </div>
                  <span className="font-medium">
                    Carried by <b className="text-white">{vessel.name}</b>{" "}
                    <span className="text-slate-400">
                      ({vessel.imo_number})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar size={16} />
                  <span>
                    ETA:{" "}
                    <span className="text-white font-bold">
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
