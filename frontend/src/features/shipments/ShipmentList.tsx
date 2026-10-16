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
import { StatusBadge } from "../../components/ui/StatusBadge";

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
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 flex items-center justify-center gap-3">
        <Package className="animate-pulse text-blue-400" size={24} />
        <span className="text-slate-400 font-medium">Loading manifest...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="text-slate-500" size={16} />
            <h3 className="text-sm font-semibold text-white">
              Active Manifest
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
            {shipments?.length || 0} Shipments
          </span>
        </div>
      </div>

      {/* Shipments Grid */}
      <div className="p-4 grid gap-2.5">
        {shipments?.map((shipment) => (
          <div
            key={shipment.id}
            className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4 hover:border-slate-700 transition-colors"
          >
            {/* Column 1: ID & Customer */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <Package size={18} className="text-slate-500 shrink-0" />
              <div>
                <h4 className="font-medium text-white text-sm">
                  {shipment.tracking_number}
                </h4>
                <p className="text-xs text-slate-500">
                  {shipment.customer_name}
                </p>
              </div>
            </div>

            {/* Column 2: Route */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Anchor size={13} className="text-slate-500" />
                {getPortName(shipment.origin_port_id)}
              </span>
              <ArrowRight size={13} className="text-slate-600" />
              <span className="flex items-center gap-1">
                <Anchor size={13} className="text-slate-500" />
                {getPortName(shipment.destination_port_id)}
              </span>
            </div>

            {/* Column 3: Status & Vessel */}
            <div className="text-right">
              <StatusBadge status={shipment.status} />
              <p className="text-xs text-slate-500 mt-1.5">
                Via:{" "}
                <span className="text-slate-400">
                  {getVesselName(shipment.vessel_id)}
                </span>
              </p>
            </div>

            {/* Column 4: Details & Actions */}
            <div className="flex flex-col items-end gap-2">
              <div className="text-xs text-slate-500 flex items-center gap-1 tabular-nums">
                <Scale size={12} />
                {shipment.weight_kg} kg
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDownload(shipment.tracking_number)}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-md text-slate-300 font-medium transition-colors"
                  title="Download Bill of Lading"
                >
                  <FileText size={13} /> BOL
                </button>
                <button
                  onClick={() => setEditingShipment(shipment)}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-md text-blue-400 font-medium transition-colors"
                  title="Edit Shipment"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(shipment.id)}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-red-500/15 px-2.5 py-1.5 rounded-md text-red-400 font-medium transition-colors"
                  title="Delete Shipment"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {shipments?.length === 0 && (
          <div className="text-center py-16">
            <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-4">
              <Package className="text-slate-600" size={48} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1.5">
              No Active Shipments
            </h3>
            <p className="text-slate-500 text-sm">
              Create a new booking using the form on the left
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-3">
              Delete Shipment
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Are you sure you want to delete this shipment? This action cannot
              be undone.
            </p>

            {/* Error Message */}
            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-2">
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
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleteError(null);
                  try {
                    await deleteShipment(deleteConfirm).unwrap();
                    setDeleteConfirm(null);
                  } catch (err) {
                    console.error("Delete failed:", err);
                    const apiError = err as {
                      data?: { error?: string };
                      message?: string;
                    };
                    setDeleteError(
                      apiError?.data?.error ||
                        apiError?.message ||
                        "Failed to delete shipment. Please try again.",
                    );
                  }
                }}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-white">
                Edit Shipment
              </h3>
              <button
                onClick={() => {
                  setEditingShipment(null);
                  setEditError(null);
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {editError && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-start gap-2">
                <AlertCircle
                  size={18}
                  className="text-amber-400 mt-0.5 flex-shrink-0"
                />
                <p className="text-sm text-amber-300">{editError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={editingShipment.tracking_number}
                  disabled
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_TRANSIT">IN_TRANSIT</option>
                  <option value="DELIVERED">DELIVERED</option>
                </select>
              </div>
              <p className="text-sm text-slate-500 italic">
                Note: Full edit functionality coming soon. For now, you can only
                change the status.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditingShipment(null);
                    setEditError(null);
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setEditError(
                      "Update functionality will be implemented with backend support",
                    );
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-md font-medium transition-colors"
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
