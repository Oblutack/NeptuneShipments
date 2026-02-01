import { useGetPortsQuery } from "../api/apiSlice";
import { useNavigate } from "react-router-dom";
import { Anchor, Calendar, ArrowRight } from "lucide-react";

export const SchedulerLanding = () => {
  const { data: ports, isLoading } = useGetPortsQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading ports...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Calendar className="text-blue-400" size={32} />
            Berth Planning
          </h1>
          <p className="text-slate-400">
            Select a port to view and manage berth allocations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ports?.map((port) => (
            <button
              key={port.id}
              onClick={() => navigate(`/dashboard/ports/${port.id}/schedule`)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 rounded-lg p-6 text-left transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-900/50 rounded-lg">
                    <Anchor className="text-blue-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {port.name}
                    </h3>
                    <p className="text-slate-400 text-sm">{port.un_locode}</p>
                  </div>
                </div>
                <ArrowRight
                  className="text-slate-600 group-hover:text-blue-400 transition"
                  size={20}
                />
              </div>

              <div className="text-slate-400 text-sm">
                <p>{port.country}</p>
                <p className="text-xs mt-1 text-slate-500">{port.type}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
