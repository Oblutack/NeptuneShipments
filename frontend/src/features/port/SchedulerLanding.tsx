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

type ViewMode = "grid" | "list";

export const SchedulerLanding = () => {
  const { data: ports, isLoading } = useGetPortsQuery();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-orange-400" size={32} />
          <span className="text-slate-300 font-medium">Loading ports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* ✨ Modern Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg shadow-orange-500/20">
              <Calendar className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Berth Planning
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Select a port to view and manage berth allocations
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                viewMode === "grid"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Grid3x3 size={18} />
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                viewMode === "list"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <List size={18} />
              List
            </button>
          </div>
        </div>

        {/* Ports Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ports?.map((port) => (
              <button
                key={port.id}
                onClick={() => navigate(`/dashboard/ports/${port.id}/schedule`)}
                className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 hover:border-orange-500/50 rounded-2xl p-6 text-left transition-all group hover:shadow-xl hover:shadow-orange-500/10"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30 group-hover:bg-orange-500/30 transition-colors">
                      <Anchor className="text-orange-400" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-1">
                        {port.name}
                      </h3>
                      <p className="text-slate-400 text-sm font-medium">
                        {port.un_locode}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="text-slate-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all"
                    size={20}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{port.country}</span>
                  <span className="text-xs text-slate-500 bg-slate-900/50 px-3 py-1 rounded-lg">
                    {port.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {ports?.map((port) => (
              <button
                key={port.id}
                onClick={() => navigate(`/dashboard/ports/${port.id}/schedule`)}
                className="w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700 hover:border-orange-500/50 rounded-xl p-5 text-left transition-all group hover:shadow-lg hover:shadow-orange-500/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30 group-hover:bg-orange-500/30 transition-colors">
                    <Anchor className="text-orange-400" size={20} />
                  </div>
                  <div className="flex items-center gap-8">
                    <div>
                      <h3 className="text-white font-bold text-base mb-0.5">
                        {port.name}
                      </h3>
                      <p className="text-slate-400 text-sm">{port.un_locode}</p>
                    </div>
                    <div className="text-slate-400 text-sm">{port.country}</div>
                    <span className="text-xs text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-lg">
                      {port.type}
                    </span>
                  </div>
                </div>
                <ArrowRight
                  className="text-slate-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all"
                  size={20}
                />
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!ports || ports.length === 0 ? (
          <div className="text-center py-16">
            <div className="p-6 bg-slate-800/50 rounded-2xl inline-block mb-4">
              <Anchor className="text-slate-600" size={64} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              No Ports Available
            </h3>
            <p className="text-slate-400">
              There are no ports configured in the system
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
