import { useGetShipmentsByVesselQuery } from "../api/apiSlice";
import {
  Loader2,
  Package,
  User,
  Scale,
  MapPin,
  ArrowRight,
  FileText,
  Container,
} from "lucide-react";

interface CargoManifestProps {
  vesselId: string;
}

export const CargoManifest = ({ vesselId }: CargoManifestProps) => {
  const { data, isLoading, error } = useGetShipmentsByVesselQuery(vesselId);

  // Loading State
  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-400" size={24} />
        <span className="text-slate-400">Loading manifest...</span>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-red-200">
        <p className="font-bold mb-2">Failed to load cargo manifest</p>
        <p className="text-sm text-red-400">Please try again later</p>
      </div>
    );
  }

  // Empty State
  if (!data || data.count === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <Package className="mx-auto mb-4 text-slate-600" size={48} />
        <h3 className="text-lg font-bold text-slate-400 mb-2">
          No Cargo Manifest Found
        </h3>
        <p className="text-sm text-slate-500">
          This vessel has no assigned shipments
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Container className="text-blue-400" size={20} />
            Cargo Manifest
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
              Vessel ID: {data.vessel_id.slice(0, 8)}...
            </span>
            <span className="text-xs font-bold text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-500/30">
              {data.count} Shipment{data.count !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 text-left font-bold">Tracking #</th>
              <th className="px-6 py-3 text-left font-bold">Container</th>
              <th className="px-6 py-3 text-left font-bold">Customer</th>
              <th className="px-6 py-3 text-left font-bold">Route</th>
              <th className="px-6 py-3 text-right font-bold">Weight</th>
              <th className="px-6 py-3 text-left font-bold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.shipments.map((shipment) => (
              <tr
                key={shipment.id}
                className="hover:bg-slate-800/30 transition-colors"
              >
                {/* Tracking Number */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-blue-400" />
                    <span className="font-mono font-bold text-white">
                      {shipment.tracking_number}
                    </span>
                  </div>
                </td>

                {/* Container Number */}
                <td className="px-6 py-4">
                  <span className="font-mono text-xs text-slate-300">
                    {shipment.container_number || (
                      <span className="text-slate-600">—</span>
                    )}
                  </span>
                </td>

                {/* Customer */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-slate-500" />
                    <span className="text-slate-300">
                      {shipment.customer_name}
                    </span>
                  </div>
                </td>

                {/* Route */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin size={12} className="text-orange-400" />
                    <span className="text-slate-400">
                      {shipment.origin_port_name}
                    </span>
                    <ArrowRight size={12} className="text-slate-600" />
                    <MapPin size={12} className="text-orange-400" />
                    <span className="text-slate-400">
                      {shipment.destination_port_name}
                    </span>
                  </div>
                </td>

                {/* Weight */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Scale size={12} className="text-slate-500" />
                    <span className="font-mono text-slate-300">
                      {shipment.weight_kg.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-600">kg</span>
                  </div>
                </td>

                {/* Description */}
                <td className="px-6 py-4">
                  <div className="flex items-start gap-2 max-w-xs">
                    <FileText
                      size={12}
                      className="text-slate-500 mt-0.5 shrink-0"
                    />
                    <span className="text-xs text-slate-400 line-clamp-2">
                      {shipment.description || (
                        <span className="text-slate-600 italic">
                          No description
                        </span>
                      )}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="bg-slate-950 border-t border-slate-800 px-6 py-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">
            Total Cargo:{" "}
            <span className="text-white font-bold">{data.count}</span> item
            {data.count !== 1 ? "s" : ""}
          </span>
          <span className="text-slate-500">
            Total Weight:{" "}
            <span className="text-white font-bold">
              {data.shipments
                .reduce((sum, s) => sum + s.weight_kg, 0)
                .toLocaleString()}
            </span>{" "}
            kg
          </span>
        </div>
      </div>
    </div>
  );
};
