import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* 1. Sidebar (Fixed) */}
      <Sidebar />

      {/* 2. Main Content Area (Scrollable) */}
      <div className="flex-1 ml-64">
        {/* We can put a global Header here later if we want */}

        {/* Render the specific page content here */}
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
