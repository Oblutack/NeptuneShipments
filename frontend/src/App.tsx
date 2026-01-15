import { useGetVesselsQuery } from "./features/api/apiSlice";
import { Ship, Map as MapIcon, Loader2 } from "lucide-react";

function App() {
  // Fetch data automatically using our Redux Hook
  const { data: vessels, isLoading, error } = useGetVesselsQuery();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
        <MapIcon className="text-blue-400" />
        NeptuneShipments
      </h1>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center gap-2 text-blue-300">
          <Loader2 className="animate-spin" /> Loading Fleet...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 p-4 rounded text-red-200">
          Error connecting to backend. Is the Go server running?
        </div>
      )}

      {/* Success State - The List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vessels?.map((ship) => (
          <div
            key={ship.id}
            className="bg-slate-900 border border-slate-800 p-6 rounded-lg shadow-lg hover:border-blue-500 transition"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Ship className="text-blue-400" size={20} />
                <h2 className="text-xl font-bold">{ship.name}</h2>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-bold ${
                  ship.status === "AT_SEA"
                    ? "bg-green-900 text-green-300"
                    : "bg-yellow-900 text-yellow-300"
                }`}
              >
                {ship.status}
              </span>
            </div>

            <div className="space-y-2 text-slate-400 text-sm">
              <p>
                Type: <span className="text-white">{ship.type}</span>
              </p>
              <p>
                IMO: <span className="text-white">{ship.imo_number}</span>
              </p>
              <p>
                Coords: {ship.latitude.toFixed(4)}, {ship.longitude.toFixed(4)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
