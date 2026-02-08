import {
  useGetShipmentsQuery,
  useGetPortsQuery,
  useGetVesselsQuery,
} from "../api/apiSlice";
import { Package, ArrowRight, Anchor, Scale, FileText } from "lucide-react";

export const ShipmentList = () => {
  // We need all three pieces of data to show meaningful info
  // (e.g. Turn "port_id_123" into "Shanghai")
  const { data: shipments, isLoading } = useGetShipmentsQuery();
  const { data: ports } = useGetPortsQuery();
  const { data: vessels } = useGetVesselsQuery();

  // Helper to find names by ID
  const getPortName = (id: string) =>
    ports?.find((p) => p.id === id)?.name || "Unknown Port";
  const getVesselName = (id: string | undefined) => {
    if (!id) return "Unassigned";
    return vessels?.find((v) => v.id === id)?.name || "Unknown Vessel";
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 flex items-center justify-center gap-3">
        <Package className="animate-pulse text-purple-400" size={28} />
        <span className="text-slate-300 font-medium">Loading manifest...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Package className="text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Active Manifest</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Currently tracked shipments
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-400 bg-blue-900/30 px-4 py-2 rounded-xl border border-blue-500/30">
            {shipments?.length || 0} Shipments
          </span>
        </div>
      </div>

      {/* Shipments Grid */}
      <div className="p-6 grid gap-4">
        {shipments?.map((shipment) => (
          <div
            key={shipment.id}
            className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all"
          >
            {/* Column 1: ID & Customer */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                <Package size={20} className="text-purple-400" />
              </div>
              <div>
                <h4 className="font-bold text-white">
                  {shipment.tracking_number}
                </h4>
                <p className="text-xs text-slate-400">
                  {shipment.customer_name}
                </p>
              </div>
            </div>

            {/* Column 2: Route */}
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="flex items-center gap-1">
                <Anchor size={14} className="text-orange-400" />
                {getPortName(shipment.origin_port_id)}
              </span>
              <ArrowRight size={14} className="text-slate-500" />
              <span className="flex items-center gap-1">
                <Anchor size={14} className="text-orange-400" />
                {getPortName(shipment.destination_port_id)}
              </span>
            </div>

            {/* Column 3: Status & Vessel */}
            <div className="text-right">
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  shipment.status === "PENDING"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : shipment.status === "IN_TRANSIT"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-green-500/20 text-green-400 border border-green-500/30"
                }`}
              >
                {shipment.status.replace("_", " ")}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Via:{" "}
                <span className="text-slate-300">
                  {getVesselName(shipment.vessel_id)}
                </span>
              </p>
            </div>

            {/* Column 4: Details & Actions */}
            <div className="flex flex-col items-end gap-2">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Scale size={12} />
                {shipment.weight_kg} kg
              </div>
              <button
                onClick={() => handleDownload(shipment.tracking_number)}
                className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-white font-medium transition-all hover:shadow-lg"
                title="Download Bill of Lading"
              >
                <FileText size={14} /> BOL
              </button>
            </div>
          </div>
        ))}

        {shipments?.length === 0 && (
          <div className="text-center py-16">
            <div className="p-6 bg-slate-800/50 rounded-2xl inline-block mb-4">
              <Package className="text-slate-600" size={64} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              No Active Shipments
            </h3>
            <p className="text-slate-400">
              Create a new booking using the form on the left
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const handleDownload = async (trackingNum: string) => {
  // We use fetch manually to handle the Blob (File) download
  // We need the token from localStorage
  const token = localStorage.getItem("token");

  const response = await fetch(
    `http://127.0.0.1:8080/api/shipments/${trackingNum}/bol`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOL-${trackingNum}.pdf`;
    a.click();
  } else {
    alert("Failed to download Bill of Lading");
  }
};
