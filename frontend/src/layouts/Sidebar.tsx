import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Map as MapIcon,
  Ship,
  Package,
  Settings,
  LogOut,
  Globe,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice";

export const Sidebar = () => {
  const dispatch = useDispatch();

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
    { icon: MapIcon, label: "Live Map", path: "/dashboard/map" },
    { icon: Ship, label: "Fleet Manager", path: "/dashboard/fleet" },
    { icon: Package, label: "Cargo Manifests", path: "/dashboard/cargo" },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-50">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Globe className="text-blue-500 mr-3" />
        <span className="font-bold text-white tracking-tight">
          Neptune<span className="text-slate-500">OS</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"} // Only match exact for root
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800">
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              isActive
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`
          }
        >
          <Settings size={20} />
          Settings
        </NavLink>
        <button
          onClick={() => dispatch(logout())}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium mt-1"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
