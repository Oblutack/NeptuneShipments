import { Outlet, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "../components/ui/ToastContainer";
import { useWebSocket } from "../features/notifications/useWebSocket";
import { selectCurrentUser } from "../features/auth/authSlice";

export const DashboardLayout = () => {
  useWebSocket();
  const user = useSelector(selectCurrentUser);

  // The admin dashboard isn't just hidden from a CLIENT - the API
  // already scopes their data to their own shipments, but there's no
  // reason to render a fleet/crew/finance UI they have no business in.
  if (user?.role === "CLIENT") {
    return <Navigate to="/portal" replace />;
  }

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
