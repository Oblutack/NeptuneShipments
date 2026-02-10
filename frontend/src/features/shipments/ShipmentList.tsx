import {
  useGetShipmentsQuery,
  useGetPortsQuery,
  useGetVesselsQuery,
  useDeleteShipmentMutation,
  type Shipment,
} from "../api/apiSlice";
import {
  Package,
  ArrowRight,
  Anchor,
  Scale,
  FileText,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";

export const ShipmentList = () => {
  // We need all three pieces of data to show meaningful info
  // (e.g. Turn "port_id_123" into "Shanghai")
  const { data: shipments, isLoading } = useGetShipmentsQuery();
  const { data: ports } = useGetPortsQuery();
  const { data: vessels } = useGetVesselsQuery();
  const [deleteShipment, { isLoading: isDeleting }] =
    useDeleteShipmentMutation();

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(shipment.tracking_number)}
                  className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-white font-medium transition-all hover:shadow-lg"
                  title="Download Bill of Lading"
                >
                  <FileText size={14} /> BOL
                </button>
                <button
                  onClick={() => setEditingShipment(shipment)}
                  className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-white font-medium transition-all hover:shadow-lg hover:shadow-blue-500/30"
                  title="Edit Shipment"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(shipment.id)}
                  className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-500 px-3 py-2 rounded-lg text-white font-medium transition-all hover:shadow-lg hover:shadow-red-500/30"
                  title="Delete Shipment"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              Delete Shipment
            </h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this shipment? This action cannot
              be undone.
            </p>

            {/* Error Message */}
            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle
                  size={18}
                  className="text-red-400 mt-0.5 flex-shrink-0"
                />
                <p className="text-sm text-red-300">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleteError(null);
                  try {
                    await deleteShipment(deleteConfirm).unwrap();
                    setDeleteConfirm(null);
                  } catch (err: any) {
                    console.error("Delete failed:", err);
                    setDeleteError(
                      err?.data?.error ||
                        err?.message ||
                        "Failed to delete shipment. Please try again.",
                    );
                  }
                }}
                disabled={isDeleting}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Placeholder */}
      {editingShipment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Edit Shipment</h3>
              <button
                onClick={() => {
                  setEditingShipment(null);
                  setEditError(null);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {editError && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle
                  size={18}
                  className="text-yellow-400 mt-0.5 flex-shrink-0"
                />
                <p className="text-sm text-yellow-300">{editError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={editingShipment.tracking_number}
                  disabled
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Status
                </label>
                <select
                  value={editingShipment.status}
                  onChange={(e) =>
                    setEditingShipment({
                      ...editingShipment,
                      status: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_TRANSIT">IN_TRANSIT</option>
                  <option value="DELIVERED">DELIVERED</option>
                </select>
              </div>
              <p className="text-sm text-slate-400 italic">
                Note: Full edit functionality coming soon. For now, you can only
                change the status.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditingShipment(null);
                    setEditError(null);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setEditError(
                      "Update functionality will be implemented with backend support",
                    );
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/30"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const handleDownload = async (trackingNum: string) => {
  // We use fetch manually to handle the Blob (File) download
  // We need the token from localStorage
  const token = localStorage.getItem("token");

  try {
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
      window.URL.revokeObjectURL(url);
    } else {
      console.error("Failed to download BOL:", response.statusText);
      // Could show a toast notification here instead
    }
  } catch (err) {
    console.error("Download error:", err);
  }
};
