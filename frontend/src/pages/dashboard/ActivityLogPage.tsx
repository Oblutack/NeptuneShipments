import { useGetAuditLogQuery, type AuditLogEntry } from "../../features/api/apiSlice";
import { ShieldCheck, Loader2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataTable } from "../../components/ui/DataTable";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "text-emerald-400",
  UPDATE: "text-blue-400",
  DELETE: "text-red-400",
  REFUEL: "text-blue-400",
  MAINTAIN: "text-amber-400",
  ASSIGN: "text-blue-400",
  IMPORT: "text-purple-400",
};

export const ActivityLogPage = () => {
  const { data, isLoading } = useGetAuditLogQuery(undefined, {
    pollingInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-400" size={28} />
          <span className="text-slate-400 font-medium">
            Loading activity log...
          </span>
        </div>
      </div>
    );
  }

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      accessorKey: "created_at",
      header: "Time",
      cell: ({ row }) => (
        <span className="text-slate-400 tabular-nums">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "actor_email",
      header: "Actor",
      cell: ({ row }) => (
        <span className="text-white font-medium">
          {row.original.actor_email}
        </span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span
          className={`font-medium ${ACTION_COLORS[row.original.action] ?? "text-slate-300"}`}
        >
          {row.original.action}
        </span>
      ),
    },
    { accessorKey: "entity_type", header: "Entity" },
    {
      accessorKey: "entity_id",
      header: "Entity ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-500">
          {row.original.entity_id ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        title="Activity Log"
        subtitle="Audit trail of admin actions across the fleet"
        actions={
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">
              Entries
            </div>
            <div className="text-lg font-semibold text-white tabular-nums">
              {data?.count || 0}
            </div>
          </div>
        }
      />

      <DataTable columns={columns} data={data?.entries || []} />
    </>
  );
};
