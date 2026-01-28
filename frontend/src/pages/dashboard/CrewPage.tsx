import { useGetCrewQuery } from "../../features/api/apiSlice";
import type { CrewMember } from "../../features/api/apiSlice";
import { DataTable } from "../../components/ui/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { User, Anchor, BadgeCheck, Loader2, MapPin } from "lucide-react";

export const CrewPage = () => {
  const { data, isLoading } = useGetCrewQuery(undefined, {
    pollingInterval: 5000,
  });

  // Table column configuration
  const columns: ColumnDef<CrewMember>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {row.original.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white">{row.original.name}</p>
            <p className="text-xs text-slate-500">{row.original.license_number}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const roleColors: Record<string, string> = {
          CAPTAIN: "bg-purple-900/30 text-purple-300 border-purple-500/50",
          CHIEF_ENGINEER:
            "bg-orange-900/30 text-orange-300 border-orange-500/50",
          FIRST_OFFICER: "bg-blue-900/30 text-blue-300 border-blue-500/50",
          DECKHAND: "bg-slate-800 text-slate-300 border-slate-600",
          COOK: "bg-green-900/30 text-green-300 border-green-500/50",
        };

        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              roleColors[row.original.role] || "bg-slate-800 text-slate-300"
            }`}
          >
            {row.original.role.replace("_", " ")}
          </span>
        );
      },
    },
    {
      accessorKey: "nationality",
      header: "Nationality",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-300">
          <MapPin size={14} className="text-slate-500" />
          <span>{row.original.nationality}</span>
        </div>
      ),
    },
    {
      accessorKey: "vessel_name",
      header: "Assigned Vessel",
      cell: ({ row }) => {
        if (!row.original.vessel_id) {
          return (
            <span className="px-3 py-1 bg-slate-800 text-slate-500 rounded-full text-xs font-bold border border-slate-700">
              Unassigned
            </span>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Anchor size={14} className="text-blue-400" />
            <span className="text-slate-300 font-medium">
              {row.original.vessel_name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusColors: Record<string, string> = {
          ACTIVE: "bg-green-900/30 text-green-300 border-green-500/50",
          ON_LEAVE: "bg-yellow-900/30 text-yellow-300 border-yellow-500/50",
          RETIRED: "bg-slate-800 text-slate-500 border-slate-700",
        };

        const statusIcons: Record<string, React.ReactNode> = {
          ACTIVE: <BadgeCheck size={12} />,
          ON_LEAVE: <User size={12} />,
          RETIRED: <User size={12} />,
        };

        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 w-fit ${
              statusColors[row.original.status] || "bg-slate-800"
            }`}
          >
            {statusIcons[row.original.status]}
            {row.original.status.replace("_", " ")}
          </span>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="animate-spin" />
        Loading crew roster...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <User className="text-cyan-400" size={32} />
        <div>
          <h1 className="text-3xl font-bold text-white">Crew Management</h1>
          <p className="text-sm text-slate-500">
            Personnel roster and assignments
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Crew"
          value={data?.total || 0}
          color="blue"
          icon={<User size={20} />}
        />
        <StatCard
          label="Active"
          value={data?.crew.filter((c) => c.status === "ACTIVE").length || 0}
          color="green"
          icon={<BadgeCheck size={20} />}
        />
        <StatCard
          label="On Leave"
          value={data?.crew.filter((c) => c.status === "ON_LEAVE").length || 0}
          color="yellow"
          icon={<User size={20} />}
        />
        <StatCard
          label="Assigned"
          value={data?.crew.filter((c) => c.vessel_id !== null).length || 0}
          color="purple"
          icon={<Anchor size={20} />}
        />
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <DataTable columns={columns} data={data?.crew || []} />
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "yellow" | "purple";
  icon: React.ReactNode;
}) => {
  const colorClasses = {
    blue: "bg-blue-900/30 border-blue-500/50 text-blue-300",
    green: "bg-green-900/30 border-green-500/50 text-green-300",
    yellow: "bg-yellow-900/30 border-yellow-500/50 text-yellow-300",
    purple: "bg-purple-900/30 border-purple-500/50 text-purple-300",
  };

  return (
    <div
      className={`${colorClasses[color]} border rounded-lg p-4 flex items-center justify-between`}
    >
      <div>
        <p className="text-xs uppercase tracking-wider mb-1 opacity-70">
          {label}
        </p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      {icon}
    </div>
  );
};
