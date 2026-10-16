import { useState } from "react";
import { useGetPortsQuery } from "../api/apiSlice";
import { useNavigate } from "react-router-dom";
import {
  Anchor,
  Calendar,
  ArrowRight,
  Grid3x3,
  List,
  Loader2,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";

type ViewMode = "grid" | "list";

export const SchedulerLanding = () => {
  const { data: ports, isLoading } = useGetPortsQuery();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-400" size={28} />
          <span className="text-slate-400 font-medium">Loading ports...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        icon={Calendar}
        title="Berth Planning"
        subtitle="Select a port to view and manage berth allocations"
        actions={
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-md p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-blue-500/10 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid3x3 size={14} />
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-blue-500/10 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List size={14} />
              List
            </button>
          </div>
        }
      />

      {/* Ports Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ports?.map((port) => (
            <button
              key={port.id}
              onClick={() => navigate(`/dashboard/ports/${port.id}/schedule`)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-4 text-left transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <Anchor className="text-slate-500" size={18} />
                  <div>
                    <h3 className="text-white font-medium text-sm mb-0.5">
                      {port.name}
                    </h3>
                    <p className="text-slate-500 text-xs">{port.un_locode}</p>
                  </div>
                </div>
                <ArrowRight
                  className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all"
                  size={16}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{port.country}</span>
                <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                  {port.type}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {ports?.map((port) => (
            <button
              key={port.id}
              onClick={() => navigate(`/dashboard/ports/${port.id}/schedule`)}
              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-3.5 text-left transition-colors group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Anchor className="text-slate-500" size={16} />
                <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-white font-medium text-sm">
                      {port.name}
                    </h3>
                    <p className="text-slate-500 text-xs">{port.un_locode}</p>
                  </div>
                  <div className="text-slate-400 text-sm">{port.country}</div>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    {port.type}
                  </span>
                </div>
              </div>
              <ArrowRight
                className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all"
                size={16}
              />
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!ports || ports.length === 0 ? (
        <div className="text-center py-16">
          <div className="p-5 bg-slate-800/50 rounded-lg inline-block mb-4">
            <Anchor className="text-slate-600" size={48} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1.5">
            No Ports Available
          </h3>
          <p className="text-slate-500 text-sm">
            There are no ports configured in the system
          </p>
        </div>
      ) : null}
    </>
  );
};
