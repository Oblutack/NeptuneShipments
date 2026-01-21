import { useState } from "react";
import { useGetVesselsQuery } from "../../features/api/apiSlice";
import { Ship, Loader2, Fuel, AlertTriangle } from "lucide-react"; // <--- Import Fuel, AlertTriangle
import { TankMonitor } from "../../features/fleet/TankMonitor";

export const FleetPage = () => {
  const { data: vessels, isLoading } = useGetVesselsQuery(undefined, {
    pollingInterval: 2000,
  });
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);

  // Helper to find the currently selected ship object
  const selectedShip = vessels?.find((v) => v.id === selectedShipId);

  if (isLoading) return <Loader2 className="animate-spin text-blue-500" />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Fleet Management</h1>

      {/* INSPECTOR PANEL */}
      {selectedShip && (
        <section className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-2xl space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Ship className="text-blue-400" /> {selectedShip.name} Telemetry
            </h2>
            <button
              onClick={() => setSelectedShipId(null)}
              className="text-xs bg-slate-800 px-3 py-1 rounded hover:bg-slate-700"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 1. FUEL GAUGE (New) */}
            <div className="lg:col-span-1 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 mb-4 text-slate-400">
                <Fuel size={18} />
                <span className="text-sm font-bold uppercase">Bunker Fuel</span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-48 w-16 mx-auto bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`absolute bottom-0 w-full transition-all duration-1000 ${selectedShip.fuel_level < 500 ? "bg-red-600 animate-pulse" : "bg-orange-500"}`}
                  style={{
                    height: `${(selectedShip.fuel_level / selectedShip.fuel_capacity) * 100}%`,
                  }}
                ></div>
              </div>

              <div className="text-center mt-4">
                <div className="text-xl font-mono font-bold">
                  {selectedShip.fuel_level.toFixed(0)}
                </div>
                <div className="text-xs text-slate-500">
                  / {selectedShip.fuel_capacity} Tons
                </div>
                {selectedShip.status === "DISTRESS" && (
                  <div className="mt-2 text-red-500 text-xs font-bold flex items-center justify-center gap-1">
                    <AlertTriangle size={12} /> CRITICAL
                  </div>
                )}
              </div>
            </div>

            {/* 2. CARGO TANKS (Existing) */}
            <div className="lg:col-span-3">
              <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase">
                Liquid Cargo Hold
              </h3>
              <TankMonitor vesselId={selectedShip.id} />
            </div>
          </div>
        </section>
      )}

      {/* GRID LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vessels?.map((ship) => (
          <div
            key={ship.id}
            onClick={() => setSelectedShipId(ship.id)}
            className={`p-4 rounded border cursor-pointer transition-all ${selectedShipId === ship.id ? "bg-blue-900/20 border-blue-500 ring-1 ring-blue-500" : "bg-slate-900/50 border-slate-800 hover:border-blue-500/50"}`}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">{ship.name}</h3>
              <span
                className={`text-xs px-2 py-1 rounded font-bold ${ship.status === "DISTRESS" ? "bg-red-900 text-red-200" : "bg-slate-800 text-slate-300"}`}
              >
                {ship.status}
              </span>
            </div>
            <div className="text-sm text-slate-400 flex justify-between items-center">
              <span>{ship.type}</span>
              <span
                className={
                  ship.status === "AT_SEA"
                    ? "text-green-400"
                    : ship.status === "DISTRESS"
                      ? "text-red-500"
                      : "text-yellow-400"
                }
              >
                {ship.fuel_level.toFixed(0)} Tons Fuel
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
