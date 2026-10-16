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
  type Shipment,
} from "../../features/api/apiSlice";
import { DataTable } from "../../components/ui/DataTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
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

  // Handlers (keep existing handlers)
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
      const err = error as { data?: { error?: string }; message?: string };
      toast.error(
        `❌ Delete failed: ${err.data?.error || err.message || "Unknown error"}`,
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
        if (editingItem && "imo_number" in editingItem) {
          await updateVessel({ id: editingItem.id, ...formData }).unwrap();
          toast.success("✅ Vessel updated successfully");
        } else {
          await createVessel(formData).unwrap();
          toast.success("✅ Vessel created successfully");
        }
      } else if (activeTab === "ports") {
        if (editingItem && "un_locode" in editingItem) {
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
    } catch (error) {
      const err = error as { data?: { error?: string }; message?: string };
      toast.error(
        `❌ Upload failed: ${err.data?.error || err.message || "Unknown error"}`,
      );
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
  const vesselColumns: ColumnDef<Vessel, unknown>[] = [
    {
      accessorKey: "name",
      header: "VESSEL NAME",
    },
    {
      accessorKey: "imo_number",
      header: "IMO NUMBER",
    },
    {
      accessorKey: "type",
      header: "TYPE",
      cell: ({ getValue }) => (
        <span className="uppercase text-xs font-medium text-slate-300">
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
    {
      accessorKey: "fuel_level",
      header: "FUEL",
      cell: ({ row }) => {
        const vessel = row.original;
        const percentage = (vessel.fuel_level / vessel.fuel_capacity) * 100;
        const fuelColor = percentage < 20 ? "bg-red-500" : "bg-blue-500";
        return (
          <div className="flex items-center gap-2 w-28">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${fuelColor} transition-all`}
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-9 text-right tabular-nums">
              {percentage.toFixed(0)}%
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "ACTIONS",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1.5 hover:bg-slate-800 text-blue-400 rounded-md transition-colors"
            title="Edit Vessel"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-1.5 hover:bg-red-500/15 text-red-400 rounded-md transition-colors"
            title="Delete Vessel"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const portColumns: ColumnDef<Port, unknown>[] = [
    {
      accessorKey: "name",
      header: "PORT NAME",
    },
    {
      accessorKey: "un_locode",
      header: "UN/LOCODE",
      cell: ({ getValue }) => (
        <code className="px-1.5 py-0.5 bg-slate-800 rounded text-xs font-mono text-slate-300">
          {String(getValue())}
        </code>
      ),
    },
    {
      accessorKey: "country",
      header: "COUNTRY",
    },
    {
      accessorKey: "type",
      header: "TYPE",
      cell: ({ getValue }) => (
        <span className="uppercase text-xs font-medium text-slate-300">
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: "latitude",
      header: "LATITUDE",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-slate-400">
          {Number(getValue()).toFixed(4)}°
        </span>
      ),
    },
    {
      accessorKey: "longitude",
      header: "LONGITUDE",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-slate-400">
          {Number(getValue()).toFixed(4)}°
        </span>
      ),
    },
    {
      id: "actions",
      header: "ACTIONS",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1.5 hover:bg-slate-800 text-blue-400 rounded-md transition-colors"
            title="Edit Port"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-1.5 hover:bg-red-500/15 text-red-400 rounded-md transition-colors"
            title="Delete Port"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const shipmentColumns: ColumnDef<Shipment, unknown>[] = [
    {
      accessorKey: "tracking_number",
      header: "TRACKING #",
      cell: ({ getValue }) => (
        <code className="px-1.5 py-0.5 bg-slate-800 rounded text-xs font-mono text-slate-300">
          {String(getValue())}
        </code>
      ),
    },
    {
      accessorKey: "description",
      header: "CARGO TYPE",
    },
    {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
    {
      accessorKey: "origin_port_name",
      header: "ORIGIN",
    },
    {
      accessorKey: "destination_port_name",
      header: "DESTINATION",
    },
  ];

  const tabs = [
    {
      id: "vessels" as Tab,
      label: "Vessels",
      icon: Ship,
      count: vessels.length,
      color: "blue",
    },
    {
      id: "ports" as Tab,
      label: "Ports",
      icon: Anchor,
      count: ports.length,
      color: "cyan",
    },
    {
      id: "shipments" as Tab,
      label: "Shipments",
      icon: Package,
      count: shipments.length,
      color: "purple",
    },
  ];

  const isLoading = vesselsLoading || portsLoading || shipmentsLoading;

  return (
    <>
      <PageHeader
        icon={Database}
        title="Data Management"
        subtitle="Manage vessels, ports, and shipments"
      />

      <div className="space-y-4">
        {/* Tabs */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5">
          <div className="flex gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors flex-1 ${
                    isActive
                      ? "bg-blue-500/10 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-blue-400" : ""} />
                  <span className="font-medium text-sm">{tab.label}</span>
                  <span className="ml-auto px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-medium tabular-nums">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar */}
        {activeTab !== "shipments" && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium text-sm transition-colors"
            >
              <Plus size={16} />
              Add {activeTab === "vessels" ? "Vessel" : "Port"}
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-md font-medium text-sm hover:bg-slate-700 transition-colors"
            >
              <Download size={16} />
              Download Template
            </button>

            <button
              onClick={() =>
                activeTab === "vessels"
                  ? vesselFileRef.current?.click()
                  : portFileRef.current?.click()
              }
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-md font-medium text-sm hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
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
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
              <Loader2 className="animate-spin text-blue-400" size={32} />
              <p className="text-slate-400 font-medium">Loading data...</p>
            </div>
          ) : (
            <>
              {activeTab === "vessels" && vessels.length === 0 && (
                <EmptyState
                  icon={Ship}
                  title="No vessels found"
                  description="Get started by adding your first vessel or upload a CSV file."
                  action={handleAdd}
                  actionLabel="Add Vessel"
                />
              )}
              {activeTab === "ports" && ports.length === 0 && (
                <EmptyState
                  icon={Anchor}
                  title="No ports found"
                  description="Get started by adding your first port or upload a CSV file."
                  action={handleAdd}
                  actionLabel="Add Port"
                />
              )}
              {activeTab === "shipments" && shipments.length === 0 && (
                <EmptyState
                  icon={Package}
                  title="No shipments found"
                  description="Shipments will appear here once created."
                />
              )}

              {activeTab === "vessels" && vessels.length > 0 && (
                <DataTable data={vessels} columns={vesselColumns} />
              )}
              {activeTab === "ports" && ports.length > 0 && (
                <DataTable data={ports} columns={portColumns} />
              )}
              {activeTab === "shipments" && shipments.length > 0 && (
                <DataTable data={shipments} columns={shipmentColumns} />
              )}
            </>
          )}
        </div>
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
    </>
  );
};

// ========================================
// ✨ EMPTY STATE COMPONENT
// ========================================
interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center h-96 gap-3 p-8">
    <div className="p-4 bg-slate-800/50 rounded-lg">
      <Icon size={40} className="text-slate-600" />
    </div>
    <h3 className="text-base font-semibold text-slate-300">{title}</h3>
    <p className="text-slate-500 text-sm text-center max-w-md">
      {description}
    </p>
    {action && actionLabel && (
      <button
        onClick={action}
        className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium text-sm transition-colors"
      >
        <Plus size={16} />
        {actionLabel}
      </button>
    )}
  </div>
);

// ========================================
// FORM MODAL (Keep existing)
// ========================================
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2.5">
            {type === "vessels" ? <Ship size={18} /> : <Anchor size={18} />}
            {item ? "Edit" : "Add"} {type === "vessels" ? "Vessel" : "Port"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
          {type === "vessels" ? (
            <VesselForm formData={formData} onChange={handleChange} />
          ) : (
            <PortForm formData={formData} onChange={handleChange} />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-md font-medium hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md font-medium transition-colors"
            >
              {item ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ========================================
// VESSEL FORM COMPONENT
// ========================================
interface VesselFormProps {
  formData: Partial<Vessel & Port>;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

const VesselForm = ({ formData, onChange }: VesselFormProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="Vessel Name" required>
      <input
        type="text"
        name="name"
        value={formData.name || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter vessel name"
      />
    </FormField>

    <FormField label="IMO Number" required>
      <input
        type="text"
        name="imo_number"
        value={formData.imo_number || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
        placeholder="IMO1234567"
      />
    </FormField>

    <FormField label="Type" required>
      <select
        name="type"
        value={formData.type || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select Type</option>
        <option value="CONTAINER">Container</option>
        <option value="TANKER">Tanker</option>
        <option value="BULK">Bulk Carrier</option>
        <option value="RO-RO">Ro-Ro</option>
      </select>
    </FormField>

    <FormField label="Status" required>
      <select
        name="status"
        value={formData.status || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select Status</option>
        <option value="AT_SEA">At Sea</option>
        <option value="DOCKED">Docked</option>
        <option value="ANCHORED">Anchored</option>
        <option value="MAINTENANCE">Maintenance</option>
        <option value="DISTRESS">Distress</option>
      </select>
    </FormField>

    <FormField label="Latitude" required>
      <input
        type="number"
        step="0.0001"
        name="latitude"
        value={formData.latitude || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
        placeholder="-90.0000 to 90.0000"
      />
    </FormField>

    <FormField label="Longitude" required>
      <input
        type="number"
        step="0.0001"
        name="longitude"
        value={formData.longitude || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
        placeholder="-180.0000 to 180.0000"
      />
    </FormField>

    <FormField label="Fuel Level (%)">
      <input
        type="number"
        step="0.1"
        name="fuel_level"
        value={formData.fuel_level || 100}
        onChange={onChange}
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        min="0"
        max="100"
      />
    </FormField>

    <FormField label="Fuel Capacity (%)">
      <input
        type="number"
        step="0.1"
        name="fuel_capacity"
        value={formData.fuel_capacity || 100}
        onChange={onChange}
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        min="0"
      />
    </FormField>
  </div>
);

// ========================================
// PORT FORM COMPONENT
// ========================================
interface PortFormProps {
  formData: Partial<Vessel & Port>;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

const PortForm = ({ formData, onChange }: PortFormProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField label="Port Name" required>
      <input
        type="text"
        name="name"
        value={formData.name || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter port name"
      />
    </FormField>

    <FormField label="UN/LOCODE" required>
      <input
        type="text"
        name="un_locode"
        value={formData.un_locode || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
        placeholder="USNYC"
        maxLength={5}
      />
    </FormField>

    <FormField label="Country" required>
      <input
        type="text"
        name="country"
        value={formData.country || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter country"
      />
    </FormField>

    <FormField label="Type" required>
      <select
        name="type"
        value={formData.type || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select Type</option>
        <option value="COMMERCIAL">Commercial</option>
        <option value="INDUSTRIAL">Industrial</option>
        <option value="NAVAL">Naval</option>
      </select>
    </FormField>

    <FormField label="Latitude" required>
      <input
        type="number"
        step="0.0001"
        name="latitude"
        value={formData.latitude || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
        placeholder="-90.0000 to 90.0000"
      />
    </FormField>

    <FormField label="Longitude" required>
      <input
        type="number"
        step="0.0001"
        name="longitude"
        value={formData.longitude || ""}
        onChange={onChange}
        required
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
        placeholder="-180.0000 to 180.0000"
      />
    </FormField>
  </div>
);

// ========================================
// FORM FIELD WRAPPER
// ========================================
interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

const FormField = ({ label, required, children }: FormFieldProps) => (
  <div className="space-y-2">
    <label className="block text-xs font-medium text-slate-400 mb-1.5">
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
    {children}
  </div>
);

export default DataManagementPage;
