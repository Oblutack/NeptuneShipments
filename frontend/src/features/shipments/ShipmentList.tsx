import { useGetShipmentsQuery, useGetPortsQuery, useGetVesselsQuery } from '../api/apiSlice';
import { Package, ArrowRight, Anchor, Scale } from 'lucide-react';

export const ShipmentList = () => {
  // We need all three pieces of data to show meaningful info
  // (e.g. Turn "port_id_123" into "Shanghai")
  const { data: shipments, isLoading } = useGetShipmentsQuery();
  const { data: ports } = useGetPortsQuery();
  const { data: vessels } = useGetVesselsQuery();

  // Helper to find names by ID
  const getPortName = (id: string) => ports?.find(p => p.id === id)?.name || 'Unknown Port';
  const getVesselName = (id: string | undefined) => {
    if (!id) return 'Unassigned';
    return vessels?.find(v => v.id === id)?.name || 'Unknown Vessel';
  };

  if (isLoading) return <div className="text-slate-500">Loading Manifest...</div>;

  return (
    <div className="grid gap-4">
      {shipments?.map((shipment) => (
        <div key={shipment.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-500 transition">
            
            {/* Column 1: ID & Customer */}
            <div className="flex items-center gap-3 min-w-[200px]">
                <div className="p-3 bg-blue-900/30 rounded-full text-blue-400">
                    <Package size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-white">{shipment.tracking_number}</h4>
                    <p className="text-xs text-slate-400">{shipment.customer_name}</p>
                </div>
            </div>

            {/* Column 2: Route */}
            <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="flex items-center gap-1">
                    <Anchor size={14} className="text-orange-400"/> 
                    {getPortName(shipment.origin_port_id)}
                </span>
                <ArrowRight size={14} className="text-slate-500" />
                <span className="flex items-center gap-1">
                    <Anchor size={14} className="text-orange-400"/> 
                    {getPortName(shipment.destination_port_id)}
                </span>
            </div>

            {/* Column 3: Status & Vessel */}
            <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                    shipment.status === 'PENDING' ? 'bg-yellow-900 text-yellow-200' : 'bg-green-900 text-green-200'
                }`}>
                    {shipment.status}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                    Via: <span className="text-slate-300">{getVesselName(shipment.vessel_id)}</span>
                </p>
            </div>
            
            {/* Column 4: Details */}
             <div className="text-xs text-slate-500 flex items-center gap-1">
                <Scale size={12} />
                {shipment.weight_kg} kg
            </div>
        </div>
      ))}
      
      {shipments?.length === 0 && (
        <div className="text-center text-slate-500 py-8">No active shipments found. Create one above!</div>
      )}
    </div>
  );
};