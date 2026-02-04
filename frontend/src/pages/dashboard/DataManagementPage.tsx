import { useState, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Database,
  Upload,
  Download,
  Plus,
  Pencil,
  Trash2,
  Ship,
  Anchor,
  Package,
  X,
  Loader2,
} from "lucide-react";
import {
  useGetVesselsQuery,
  useGetPortsQuery,
  useGetShipmentsQuery,
  useCreateVesselMutation,
  useUpdateVesselMutation,
  useDeleteVesselMutation,
  useUploadVesselCSVMutation,
  useLazyDownloadVesselTemplateQuery,
  useCreatePortMutation,
  useUpdatePortMutation,
  useDeletePortMutation,
  useUploadPortCSVMutation,
  useLazyDownloadPortTemplateQuery,
  type Vessel,
  type Port,
} from "../../features/api/apiSlice";
import { DataTable } from "../../components/ui/DataTable";
import { toast } from "react-toastify";

type Tab = "vessels" | "ports" | "shipments";

type EditableItem = Vessel | Port | null;

const DataManagementPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("vessels");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EditableItem>(null);
  const [isUploading, setIsUploading] = useState(false);

  const vesselFileRef = useRef<HTMLInputElement>(null);
  const portFileRef = useRef<HTMLInputElement>(null);

  // API Hooks
  const { data: vessels = [], isLoading: vesselsLoading } =
    useGetVesselsQuery(undefined);
  const { data: ports = [], isLoading: portsLoading } =
    useGetPortsQuery(undefined);
  const { data: shipments = [], isLoading: shipmentsLoading } =
    useGetShipmentsQuery(undefined);

  const [createVessel] = useCreateVesselMutation();
  const [updateVessel] = useUpdateVesselMutation();
  const [deleteVessel] = useDeleteVesselMutation();
  const [uploadVesselCSV] = useUploadVesselCSVMutation();
  const [downloadVesselTemplate] = useLazyDownloadVesselTemplateQuery();

  const [createPort] = useCreatePortMutation();
  const [updatePort] = useUpdatePortMutation();
  const [deletePort] = useDeletePortMutation();
  const [uploadPortCSV] = useUploadPortCSVMutation();
  const [downloadPortTemplate] = useLazyDownloadPortTemplateQuery();

  // ========================================
  // HANDLERS
  // ========================================
  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "⚠️ Are you sure you want to delete this item? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      if (activeTab === "vessels") {
        await deleteVessel(id).unwrap();
        toast.success("✅ Vessel deleted successfully");
      } else if (activeTab === "ports") {
        await deletePort(id).unwrap();
        toast.success("✅ Port deleted successfully");
      }
    } catch (error) {
      // ✅ FIXED: Remove 'any' type
      const err = error as { data?: { error?: string }; message?: string };
      toast.error(
        `Delete failed: ${err.data?.error || err.message || "Unknown error"}`,
      );
    }
  };

  const handleEdit = (item: Vessel | Port) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleSubmit = async (formData: Partial<Vessel> | Partial<Port>) => {
    try {
      if (activeTab === "vessels") {
        if (editingItem) {
          await updateVessel({ id: editingItem.id, ...formData }).unwrap();
          toast.success("✅ Vessel updated successfully");
        } else {
          await createVessel(formData).unwrap();
          toast.success("✅ Vessel created successfully");
        }
      } else if (activeTab === "ports") {
        if (editingItem) {
          await updatePort({ id: editingItem.id, ...formData }).unwrap();
          toast.success("✅ Port updated successfully");
        } else {
          await createPort(formData).unwrap();
          toast.success("✅ Port created successfully");
        }
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (error) {
      const err = error as { data?: { error?: string }; message?: string };
      toast.error(
        `❌ Save failed: ${err.data?.error || err.message || "Unknown error"}`,
      );
    }
  };

  const handleCSVUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("❌ Please upload a CSV file");
      return;
    }

    setIsUploading(true);
    try {
      if (activeTab === "vessels") {
        const result = await uploadVesselCSV(file).unwrap();
        toast.success(`✅ Imported ${result.count} vessels`);
      } else if (activeTab === "ports") {
        const result = await uploadPortCSV(file).unwrap();
        toast.success(`✅ Imported ${result.count} ports`);
      }
    } catch {
      toast.error("❌ Failed to download template");
    } finally {
      setIsUploading(false);
      if (vesselFileRef.current) vesselFileRef.current.value = "";
      if (portFileRef.current) portFileRef.current.value = "";
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      let result;
      if (activeTab === "vessels") {
        result = await downloadVesselTemplate(undefined).unwrap();
      } else if (activeTab === "ports") {
        result = await downloadPortTemplate(undefined).unwrap();
      }

      if (result) {
        const url = window.URL.createObjectURL(result as Blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeTab}_template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("✅ Template downloaded");
      }
    } catch {
      toast.error("❌ Failed to download template");
    }
  };

  // ========================================
  // TABLE CONFIGURATIONS
  // ========================================
  // ✅ FIXED: Convert to TanStack Table ColumnDef format
  const vesselColumns: ColumnDef<Vessel, unknown>[] = [
    {
      accessorKey: "name",
      header: "Vessel Name",
    },
    {
      accessorKey: "imo_number",
      header: "IMO Number",
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const value = getValue() as string;
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              value === "AT_SEA"
                ? "bg-blue-100 text-blue-700"
                : value === "DOCKED"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {value}
          </span>
        );
      },
    },
    {
      accessorKey: "fuel_level",
      header: "Fuel",
      cell: ({ getValue, row }) => {
        const value = getValue() as number;
        const vessel = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  value > 50
                    ? "bg-green-500"
                    : value > 20
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${(value / vessel.fuel_capacity) * 100}%` }}
              />
            </div>
            <span className="text-xs">{value.toFixed(0)}%</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Pencil size={16} className="text-blue-600" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-1 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  // ✅ FIXED: Convert to TanStack Table ColumnDef format
  const portColumns: ColumnDef<Port, unknown>[] = [
    {
      accessorKey: "name",
      header: "Port Name",
    },
    {
      accessorKey: "un_locode",
      header: "UN/LOCODE",
    },
    {
      accessorKey: "country",
      header: "Country",
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "latitude",
      header: "Latitude",
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return value.toFixed(4);
      },
    },
    {
      accessorKey: "longitude",
      header: "Longitude",
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return value.toFixed(4);
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Pencil size={16} className="text-blue-600" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-1 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  // ✅ FIXED: Convert to TanStack Table ColumnDef format
  const shipmentColumns: ColumnDef<(typeof shipments)[number], unknown>[] = [
    {
      accessorKey: "tracking_number",
      header: "Tracking #",
    },
    {
      accessorKey: "cargo_type",
      header: "Cargo Type",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      accessorKey: "origin",
      header: "Origin",
    },
    {
      accessorKey: "destination",
      header: "Destination",
    },
  ];

  // ========================================
  // RENDER
  // ========================================
  const tabs = [
    {
      id: "vessels" as Tab,
      label: "Vessels",
      icon: Ship,
      count: vessels.length,
    },
    { id: "ports" as Tab, label: "Ports", icon: Anchor, count: ports.length },
    {
      id: "shipments" as Tab,
      label: "Shipments",
      icon: Package,
      count: shipments.length,
    },
  ];

  const isLoading = vesselsLoading || portsLoading || shipmentsLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="text-blue-600" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Data Management
            </h1>
            <p className="text-gray-500 text-sm">
              Manage vessels, ports, and shipments
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon size={18} />
              <span className="font-medium">{tab.label}</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      {activeTab !== "shipments" && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Add {activeTab === "vessels" ? "Vessel" : "Port"}
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download size={18} />
            Download Template
          </button>

          <button
            onClick={() =>
              activeTab === "vessels"
                ? vesselFileRef.current?.click()
                : portFileRef.current?.click()
            }
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            {isUploading ? "Uploading..." : "Bulk Upload CSV"}
          </button>

          <input
            ref={vesselFileRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <input
            ref={portFileRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          // ✅ FIXED: Conditional rendering instead of union types
          <>
            {activeTab === "vessels" && (
              <DataTable data={vessels} columns={vesselColumns} />
            )}
            {activeTab === "ports" && (
              <DataTable data={ports} columns={portColumns} />
            )}
            {activeTab === "shipments" && (
              <DataTable data={shipments} columns={shipmentColumns} />
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <FormModal
          type={activeTab}
          item={editingItem}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

interface FormModalProps {
  type: Tab;
  item: EditableItem;
  onClose: () => void;
  onSubmit: (data: Partial<Vessel> | Partial<Port>) => void;
}

const FormModal = ({ type, item, onClose, onSubmit }: FormModalProps) => {
  const [formData, setFormData] = useState<Partial<Vessel & Port>>(item || {});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ["latitude", "longitude", "fuel_level", "fuel_capacity"].includes(
        name,
      )
        ? parseFloat(value)
        : value,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {item ? "Edit" : "Add"} {type === "vessels" ? "Vessel" : "Port"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          {type === "vessels" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vessel Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IMO Number *
                  </label>
                  <input
                    type="text"
                    name="imo_number"
                    value={formData.imo_number || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="CONTAINER">Container</option>
                    <option value="TANKER">Tanker</option>
                    <option value="BULK">Bulk Carrier</option>
                    <option value="RO-RO">Ro-Ro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Status</option>
                    <option value="IDLE">Idle</option>
                    <option value="AT_SEA">At Sea</option>
                    <option value="DOCKED">Docked</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    name="latitude"
                    value={formData.latitude || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    name="longitude"
                    value={formData.longitude || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel Level
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="fuel_level"
                    value={formData.fuel_level || 100}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel Capacity
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="fuel_capacity"
                    value={formData.fuel_capacity || 100}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UN/LOCODE *
                  </label>
                  <input
                    type="text"
                    name="un_locode"
                    value={formData.un_locode || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="INDUSTRIAL">Industrial</option>
                    <option value="NAVAL">Naval</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    name="latitude"
                    value={formData.latitude || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    name="longitude"
                    value={formData.longitude || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {item ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DataManagementPage;
