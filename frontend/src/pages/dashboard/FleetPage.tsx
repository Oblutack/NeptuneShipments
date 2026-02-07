import { useState } from "react";
import { useGetVesselsQuery } from "../../features/api/apiSlice";
import type { Vessel } from "../../features/api/apiSlice";
import { Ship, Loader2 } from "lucide-react";
import { TankMonitor } from "../../features/fleet/TankMonitor";
import { DataTable } from "../../components/ui/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { CargoManifest } from "../../features/fleet/CargoManifest";

export const FleetPage = () => {
  const { data: vessels, isLoading } = useGetVesselsQuery(undefined, {
    pollingInterval: 2000,
  });
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);

  const selectedShip = vessels?.find((v) => v.id === selectedShipId);

  // --- TABLE COLUMNS CONFIGURATION ---
  const columns: ColumnDef<Vessel>[] = [
    {
      accessorKey: "name",
      header: "Vessel Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-bold text-white">
          <Ship size={16} className="text-blue-400" />
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: "imo_number",
      header: "IMO Number",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.imo_number}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        let colorClass = "bg-slate-800 text-slate-300";
        if (status === "AT_SEA") colorClass = "bg-green-900 text-green-300";
        if (status === "DOCKED") colorClass = "bg-yellow-900 text-yellow-300";
        if (status === "DISTRESS")
          colorClass = "bg-red-900 text-red-200 animate-pulse";

        return (
          <span className={`px-2 py-1 rounded text-xs font-bold ${colorClass}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "speed_knots",
      header: "Speed (kn)",
      cell: ({ row }) => <span>{row.original.speed_knots.toFixed(1)}</span>,
    },
  ];

  if (isLoading)
    return (
      <div className="flex items-center gap-2 p-8">
        <Loader2 className="animate-spin text-blue-500" /> Loading Fleet...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fleet Management</h1>
        <div className="text-sm text-slate-400">
          Total Vessels: <b className="text-white">{vessels?.length}</b>
        </div>
      </div>

      {/* INSPECTOR PANEL (Top Half) */}
      {selectedShip && (
        <section className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-2xl space-y-6 animate-in slide-in-from-top-4 duration-300">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Ship className="text-blue-400" /> {selectedShip.name} Telemetry
            </h2>
            <button
              onClick={() => setSelectedShipId(null)}
              className="text-xs bg-slate-800 px-3 py-1 rounded hover:bg-slate-700 transition"
            >
              Close
            </button>
          </div>

          {/* TANK MONITOR */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase">
              Liquid Cargo Hold
            </h3>
            <TankMonitor vesselId={selectedShip.id} />
          </div>
          {/* Cargo Manifest Section */}
          <CargoManifest vesselId={selectedShip.id} />
        </section>
      )}

      {/* DATA TABLE (Bottom Half) */}
      <DataTable
        columns={columns}
        data={vessels || []}
        onRowClick={(vessel) => setSelectedShipId(vessel.id)}
      />
    </div>
  );
};
