import { useGetVesselsQuery, useGetPortsQuery } from "../features/api/apiSlice";
import { Loader2, Map as MapIcon, Ship, Anchor } from "lucide-react";
import { GlobalMap } from "../features/map/GlobalMap";
import { ShipmentForm } from "../features/shipments/ShipmentForm";
import { ShipmentList } from "../features/shipments/ShipmentList";

export const Dashboard = () => {
  const { data: vessels, isLoading, error } = useGetVesselsQuery();

  const { data: ports } = useGetPortsQuery();

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

      {/* Error Message Section - Fixes 'error' unused warning */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6 bg-red-900/20 border border-red-500 text-red-200 p-4 rounded">
          Error loading fleet data. Is the Backend running?
        </div>
      )}

      <main className="max-w-7xl mx-auto space-y-8">
        {/* MAP SECTION */}
        <section>
          {isLoading ? (
            <div className="h-[600px] w-full bg-slate-900 rounded-xl flex items-center justify-center animate-pulse">
              <Loader2 className="animate-spin text-slate-600" size={40} />
            </div>
          ) : (
            <GlobalMap vessels={vessels} ports={ports} />
          )}
        </section>

        {/*SHIPMENT FORM SECTION */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            📦 Create New Shipment
          </h2>
          <ShipmentForm />
        </section>

        {/*SHIPMENT MANIFEST SECTION */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            📋 Active Manifest
          </h2>
          <ShipmentList />
        </section>

        {/* LIST SECTION - Fixes 'Ship' unused warning */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vessels?.map((ship) => (
            <div
              key={ship.id}
              className="bg-slate-900/50 border border-slate-800 p-4 rounded hover:border-blue-500/50 transition"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  {/* We use the Ship icon here */}
                  <Ship size={16} className="text-blue-400" />
                  <h3 className="font-bold text-lg">{ship.name}</h3>
                </div>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                  {ship.imo_number}
                </span>
              </div>
              <div className="text-sm text-slate-400 flex justify-between items-center">
                <span>{ship.type}</span>
                {/* Add 'ml-2' (margin left) or rely on justify-between working */}
                <span
                  className={
                    ship.status === "AT_SEA"
                      ? "text-green-400"
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
