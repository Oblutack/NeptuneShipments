const STATUS_STYLES: Record<string, string> = {
  AT_SEA: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DOCKED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  ANCHORED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  MAINTENANCE: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DISTRESS: "bg-red-500/10 text-red-400 border-red-500/20",
  PENDING: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  IN_TRANSIT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CUSTOMS_HOLD: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DELIVERED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const DEFAULT_STYLE = "bg-slate-500/10 text-slate-400 border-slate-500/20";

export const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${
      STATUS_STYLES[status] ?? DEFAULT_STYLE
    }`}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {status.replace(/_/g, " ")}
  </span>
);
