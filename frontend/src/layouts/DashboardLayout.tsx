import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "../components/ui/ToastContainer";
import { useWebSocket } from "../features/notifications/useWebSocket";

export const DashboardLayout = () => {
  useWebSocket();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* 1. Sidebar (Fixed) */}
      <Sidebar />

      {/* 2. Main Content Area (Scrollable) */}
      <div className="flex-1 ml-64 min-h-screen">
        <div className="max-w-[1800px] mx-auto p-6">
          <Outlet />
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};
