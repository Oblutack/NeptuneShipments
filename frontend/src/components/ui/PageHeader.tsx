import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const PageHeader = ({
  icon: Icon,
  title,
  subtitle,
  actions,
}: PageHeaderProps) => (
  <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
        <Icon className="text-blue-400" size={22} />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);
