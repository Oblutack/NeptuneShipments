import { useState } from "react";
import { useGetVesselsQuery, type Vessel } from "../../features/api/apiSlice";
import { Ship, Loader2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { TankMonitor } from "../../features/fleet/TankMonitor";
import { CargoManifest } from "../../features/fleet/CargoManifest";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { DataTable } from "../../components/ui/DataTable";
import { computeCII, CII_RATING_COLOR } from "../../lib/cii";

export const FleetPage = () => {
  const { data: vessels, isLoading } = useGetVesselsQuery(undefined, {
    pollingInterval: 2000,
  });
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);

  const selectedShip = vessels?.find((v) => v.id === selectedShipId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={28} />
          <span className="text-slate-400 font-medium">
            Loading fleet data...
          </span>
        </div>
      </div>
    );
  }

  const columns: ColumnDef<Vessel>[] = [
    {
      accessorKey: "name",
      header: "Vessel",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Ship size={14} className="text-slate-500" />
          <span className="font-medium text-white">{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: "imo_number", header: "IMO" },
    { accessorKey: "type", header: "Type" },
    { accessorKey: "flag_country", header: "Flag" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "speed_knots",
      header: "Speed",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.speed_knots.toFixed(1)} kn
        </span>
      ),
    },
    {
      id: "fuel",
      header: "Fuel",
      cell: ({ row }) => {
        const pct =
          (row.original.fuel_level / row.original.fuel_capacity) * 100;
        return (
          <div className="flex items-center gap-2 w-28">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  pct < 20 ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-9 text-right tabular-nums">
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      },
    },
    {
      id: "cii",
      header: "CII (est.)",
      cell: ({ row }) => {
        const result = computeCII(row.original);
        if (!result) {
          return <span className="text-xs text-slate-600">—</span>;
        }
        return (
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${CII_RATING_COLOR[result.rating]}`}
            title={`Attained ${result.attained.toFixed(1)} vs reference ${result.required.toFixed(1)} gCO2/DWT-nm`}
          >
            {result.rating}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        icon={Ship}
        title="Fleet Management"
        subtitle="Monitor vessel cargo, tanks, and shipment manifests"
        actions={
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">
              Total Fleet
            </div>
            <div className="text-lg font-semibold text-white">
              {vessels?.length || 0}
            </div>
          </div>
        }
      />

      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={vessels || []}
          onRowClick={(vessel) => setSelectedShipId(vessel.id)}
          isRowSelected={(vessel) => vessel.id === selectedShipId}
        />

        {!selectedShip ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-16 text-center">
            <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-5">
              <Ship className="text-slate-600" size={48} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1.5">
              No Vessel Selected
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Select a vessel from the table above to view cargo tanks and
              shipment manifests
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <TankMonitor vesselId={selectedShip.id} />
            <CargoManifest vesselId={selectedShip.id} />
          </div>
        )}
      </div>
    </>
  );
};
