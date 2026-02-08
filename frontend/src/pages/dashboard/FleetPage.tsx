import { useState } from "react";
import { useGetVesselsQuery } from "../../features/api/apiSlice";
import { Ship, Loader2, AlertTriangle, Anchor } from "lucide-react";
import { TankMonitor } from "../../features/fleet/TankMonitor";
import { CargoManifest } from "../../features/fleet/CargoManifest";

export const FleetPage = () => {
  const { data: vessels, isLoading } = useGetVesselsQuery(undefined, {
    pollingInterval: 2000,
  });
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);

  const selectedShip = vessels?.find((v) => v.id === selectedShipId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <span className="text-slate-400 font-medium">
            Loading fleet data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* ✨ Modern Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20">
              <Ship className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Fleet Management
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Monitor vessel cargo, tanks, and shipment manifests
              </p>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl px-6 py-3">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              Total Fleet
            </div>
            <div className="text-2xl font-bold text-white">
              {vessels?.length || 0}
            </div>
          </div>
        </div>

        {/* ✨ Modern Vessel Tabs */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {vessels?.map((vessel) => {
              const isActive = selectedShipId === vessel.id;
              return (
                <button
                  key={vessel.id}
                  onClick={() => setSelectedShipId(vessel.id)}
                  className={`p-4 rounded-xl transition-all duration-300 text-left ${
                    isActive
                      ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Ship
                      size={16}
                      className={isActive ? "text-white" : "text-blue-400"}
                    />
                    <span className="font-bold text-sm truncate">
                      {vessel.name}
                    </span>
                  </div>
                  <p
                    className={`text-xs ${isActive ? "text-white/80" : "text-slate-500"}`}
                  >
                    {vessel.type}
                  </p>
                  {vessel.status === "DISTRESS" && (
                    <div className="mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-red-400" />
                      <span className="text-xs font-bold text-red-400">
                        DISTRESS
                      </span>
                    </div>
                  )}
                  {vessel.status === "DOCKED" && (
                    <div className="mt-2 flex items-center gap-1">
                      <Anchor size={12} className="text-yellow-400" />
                      <span className="text-xs font-bold text-yellow-400">
                        DOCKED
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        {!selectedShip ? (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-16 text-center">
            <div className="p-6 bg-slate-800/50 rounded-2xl inline-block mb-6">
              <Ship className="text-slate-600" size={64} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              No Vessel Selected
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Select a vessel from the tabs above to view cargo tanks and
              shipment manifests
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <TankMonitor vesselId={selectedShip.id} />
            <CargoManifest vesselId={selectedShip.id} />
          </div>
        )}
      </div>
    </div>
  );
};
