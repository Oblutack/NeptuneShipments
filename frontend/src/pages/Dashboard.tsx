import { useGetVesselsQuery, useGetPortsQuery } from "../features/api/apiSlice";
import { Loader2, Map as MapIcon, Ship, Anchor } from "lucide-react";
import { GlobalMap } from "../features/map/GlobalMap";
import { ShipmentForm } from "../features/shipments/ShipmentForm";
import { ShipmentList } from "../features/shipments/ShipmentList";
import { useState } from "react";
import { TankMonitor } from "../features/fleet/TankMonitor";

export const Dashboard = () => {
  // 1. Data Fetching
  const {
    data: vessels,
    isLoading,
    error,
  } = useGetVesselsQuery(undefined, {
    pollingInterval: 2000,
  });
  const { data: ports } = useGetPortsQuery();

  // 2. Single Source of Truth for Selection
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <header className="flex justify-between items-center mb-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MapIcon className="text-blue-500" />
          NeptuneShipments
        </h1>
        <div className="flex gap-4 text-sm text-slate-400">
          <span>
            Active Fleet: <b className="text-white">{vessels?.length || 0}</b>
          </span>
          <span className="flex items-center gap-2">
            <Anchor size={16} />
            Ports: <b className="text-white">{ports?.length || 0}</b>
          </span>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto mb-6 bg-red-900/20 border border-red-500 text-red-200 p-4 rounded">
          Error loading fleet data. Is the Backend running?
        </div>
      )}

      <main className="max-w-7xl mx-auto space-y-8">
        {/* INSPECTOR PANEL (Only shows if ship selected) */}
        {selectedShipId && (
          <section className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Ship className="text-blue-400" />
                Vessel Telemetry
              </h2>
              <button
                onClick={() => setSelectedShipId(null)}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-slate-300 transition"
              >
                Close Inspector
              </button>
            </div>
            <TankMonitor vesselId={selectedShipId} />
          </section>
        )}

        {/* MAP SECTION */}
        <section>
          {isLoading ? (
            <div className="h-[600px] w-full bg-slate-900 rounded-xl flex items-center justify-center animate-pulse">
              <Loader2 className="animate-spin text-slate-600" size={40} />
            </div>
          ) : (
            <GlobalMap
              vessels={vessels}
              ports={ports}
              // --- CRITICAL CONNECTION ---
              selectedVesselId={selectedShipId}
              onShipClick={setSelectedShipId}
              // ---------------------------
            />
          )}
        </section>

        {/* FORMS & LISTS */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            📦 Create New Shipment
          </h2>
          <ShipmentForm />
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            📋 Active Manifest
          </h2>
          <ShipmentList />
        </section>

        {/* FLEET GRID */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vessels?.map((ship) => (
            <div
              key={ship.id}
              onClick={() => setSelectedShipId(ship.id)}
              className={`p-4 rounded border cursor-pointer transition-all ${
                selectedShipId === ship.id
                  ? "bg-blue-900/20 border-blue-500 ring-1 ring-blue-500"
                  : "bg-slate-900/50 border-slate-800 hover:border-blue-500/50"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Ship size={16} className="text-blue-400" />
                  <h3 className="font-bold text-lg">{ship.name}</h3>
                </div>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                  {ship.imo_number}
                </span>
              </div>
              <div className="text-sm text-slate-400 flex justify-between items-center">
                <span>{ship.type}</span>
                <span
                  className={
                    ship.status === "AT_SEA"
                      ? "text-green-400"
                      : ship.status === "DISTRESS"
                        ? "text-red-500 animate-pulse"
                        : "text-yellow-400"
                  }
                >
                  {ship.status}
                </span>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};
