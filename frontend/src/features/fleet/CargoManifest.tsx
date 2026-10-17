import { useState } from "react";
import { useGetShipmentsByVesselQuery, type Shipment } from "../api/apiSlice";
import { imdgLabel } from "../../lib/imdg";
import {
  Loader2,
  Package,
  User,
  Scale,
  MapPin,
  ArrowRight,
  FileText,
  Container,
  ChevronDown,
  ChevronRight,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

interface CargoManifestProps {
  vesselId: string;
}

export const CargoManifest = ({ vesselId }: CargoManifestProps) => {
  const { data, isLoading, error } = useGetShipmentsByVesselQuery(vesselId);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const calculateManifestValue = (shipment: Shipment): number => {
    return (
      shipment.manifest_items?.reduce(
        (sum, item) => sum + item.total_value,
        0,
      ) || 0
    );
  };

  const calculateTotalValue = (): number => {
    return (
      data?.shipments.reduce((sum, s) => sum + calculateManifestValue(s), 0) ||
      0
    );
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-400" size={24} />
        <span className="text-slate-400 font-medium">
          Loading cargo manifest...
        </span>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-slate-900 border-l-2 border-red-500 rounded-lg p-6 text-red-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="text-red-400" size={18} />
          <p className="font-semibold">Failed to load cargo manifest</p>
        </div>
        <p className="text-sm text-red-400/70">Please try again later</p>
      </div>
    );
  }

  // Empty State
  if (!data || data.count === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-16 text-center">
        <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-5">
          <Package className="text-slate-600" size={48} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1.5">
          No Cargo Manifest Found
        </h3>
        <p className="text-slate-500 text-sm">
          This vessel has no assigned shipments for tracking
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Container className="text-slate-500" size={16} />
            <h3 className="text-sm font-semibold text-white">
              Cargo Manifest
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
              {data.count} Shipment{data.count !== 1 ? "s" : ""}
            </span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md flex items-center gap-1">
              <DollarSign size={12} />${calculateTotalValue().toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-semibold w-8"></th>
              <th className="px-4 py-3 text-left font-semibold">Tracking #</th>
              <th className="px-4 py-3 text-left font-semibold">Container</th>
              <th className="px-4 py-3 text-left font-semibold">Customer</th>
              <th className="px-4 py-3 text-left font-semibold">Route</th>
              <th className="px-4 py-3 text-right font-semibold">Weight</th>
              <th className="px-4 py-3 text-right font-semibold">Value</th>
              <th className="px-4 py-3 text-left font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.shipments.map((shipment) => {
              const isExpanded = expandedRows.has(shipment.id);
              const hasManifest = shipment.manifest_items?.length > 0;
              const totalValue = calculateManifestValue(shipment);

              return (
                <>
                  <tr
                    key={shipment.id}
                    tabIndex={hasManifest ? 0 : undefined}
                    aria-expanded={hasManifest ? isExpanded : undefined}
                    className={`hover:bg-slate-800/50 transition-colors ${hasManifest ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500" : ""}`}
                    onClick={() => hasManifest && toggleRow(shipment.id)}
                    onKeyDown={(e) => {
                      if (!hasManifest || (e.key !== "Enter" && e.key !== " ")) return;
                      e.preventDefault();
                      toggleRow(shipment.id);
                    }}
                  >
                    {/* Expand Icon */}
                    <td className="px-4 py-3">
                      {hasManifest ? (
                        isExpanded ? (
                          <ChevronDown size={16} className="text-blue-400" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-500" />
                        )
                      ) : (
                        <div className="w-4"></div>
                      )}
                    </td>

                    {/* Tracking Number */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-blue-400" />
                        <span className="font-mono font-bold text-white">
                          {shipment.tracking_number}
                        </span>
                      </div>
                    </td>

                    {/* Container Number */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-300">
                        {shipment.container_number || (
                          <span className="text-slate-600">—</span>
                        )}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-slate-500" />
                        <span className="text-slate-300">
                          {shipment.customer_name}
                        </span>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Scale size={12} className="text-slate-500" />
                        <span className="font-mono text-slate-300">
                          {shipment.weight_kg.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-600">kg</span>
                      </div>
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DollarSign size={12} className="text-green-500" />
                        <span className="font-mono text-green-400 font-bold">
                          {totalValue.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3">
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

                  {/* Expanded Manifest Details */}
                  {isExpanded && hasManifest && (
                    <tr
                      key={`${shipment.id}-details`}
                      className="bg-slate-950/50"
                    >
                      <td colSpan={8} className="px-4 py-5">
                        <div className="ml-8">
                          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-800">
                            <Package size={14} className="text-slate-500" />
                            <h4 className="text-xs font-semibold text-white uppercase tracking-wide">
                              Manifest Items ({shipment.manifest_items.length})
                            </h4>
                          </div>
                          <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-900 text-slate-500 uppercase tracking-wide">
                                  <th className="px-4 py-3 text-left font-semibold">
                                    SKU
                                  </th>
                                  <th className="px-4 py-3 text-left font-semibold">
                                    Description
                                  </th>
                                  <th className="px-4 py-3 text-right font-semibold">
                                    Quantity
                                  </th>
                                  <th className="px-4 py-3 text-right font-semibold">
                                    Unit Value
                                  </th>
                                  <th className="px-4 py-3 text-right font-semibold">
                                    Total Value
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                {shipment.manifest_items.map((item, idx) => (
                                  <tr
                                    key={idx}
                                    className="hover:bg-slate-800/30 transition-colors"
                                  >
                                    <td className="px-4 py-3">
                                      <span className="font-mono text-blue-300 font-medium">
                                        {item.sku}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300 font-medium">
                                      <div className="flex items-center gap-2">
                                        {item.description}
                                        {item.imdg_class && (
                                          <span
                                            className="text-[9px] font-bold uppercase bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded"
                                            title={imdgLabel(item.imdg_class)}
                                          >
                                            DG {item.imdg_class}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                                      {item.quantity.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                                      $
                                      {item.unit_value.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-green-400 font-bold">
                                      $
                                      {item.total_value.toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">
            Total Cargo:{" "}
            <span className="text-white font-bold">{data.count}</span> item
            {data.count !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-6">
            <span className="text-slate-500">
              Total Weight:{" "}
              <span className="text-white font-bold">
                {data.shipments
                  .reduce((sum, s) => sum + s.weight_kg, 0)
                  .toLocaleString()}
              </span>{" "}
              kg
            </span>
            <span className="text-slate-500">
              Total Value:{" "}
              <span className="text-green-400 font-bold">
                $
                {calculateTotalValue().toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
