import { useState } from 'react';
import { useGetVesselsQuery } from '../../features/api/apiSlice';
import { Ship, Loader2 } from 'lucide-react';
import { TankMonitor } from '../../features/fleet/TankMonitor';

export const FleetPage = () => {
  const { data: vessels, isLoading } = useGetVesselsQuery(undefined, { pollingInterval: 5000 });
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);

  if (isLoading) return <Loader2 className="animate-spin text-blue-500" />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Fleet Management</h1>

      {/* INSPECTOR */}
      {selectedShipId && (
        <section className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Ship className="text-blue-400" /> Vessel Telemetry
                </h2>
                <button onClick={() => setSelectedShipId(null)} className="text-xs bg-slate-800 px-3 py-1 rounded">Close</button>
            </div>
            <TankMonitor vesselId={selectedShipId} />
        </section>
      )}

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vessels?.map((ship) => (
          <div key={ship.id} onClick={() => setSelectedShipId(ship.id)} className={`p-4 rounded border cursor-pointer transition-all ${selectedShipId === ship.id ? 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-900/50 border-slate-800 hover:border-blue-500/50'}`}>
             <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">{ship.name}</h3>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded">{ship.imo_number}</span>
             </div>
             <div className="text-sm text-slate-400 flex justify-between">
                <span>{ship.type}</span>
                <span className={ship.status === 'AT_SEA' ? 'text-green-400' : 'text-yellow-400'}>{ship.status}</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};