import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Map as MapIcon,
  Ship,
  Package,
  Settings,
  LogOut,
  Globe,
  Users,
  Receipt,
  Wrench,
  Calendar,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice";
import { Database } from "lucide-react";

export const Sidebar = () => {
  const dispatch = useDispatch();

  const navSections = [
    {
      title: "OPERATIONS",
      items: [
        { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
        { icon: MapIcon, label: "Live Map", path: "/dashboard/map" },
      ],
    },
    {
      title: "ASSETS",
      items: [
        { icon: Ship, label: "Fleet Manager", path: "/dashboard/fleet" },
        { icon: Wrench, label: "Maintenance", path: "/dashboard/maintenance" },
      ],
    },
    {
      title: "LOGISTICS",
      items: [
        { icon: Package, label: "Cargo Manifests", path: "/dashboard/cargo" },
        {
          icon: Calendar,
          label: "Berth Planner",
          path: "/dashboard/scheduler",
        },
      ],
    },
    {
      title: "BUSINESS",
      items: [
        { icon: Users, label: "Crew Management", path: "/dashboard/crew" },
        { icon: Receipt, label: "Financials", path: "/dashboard/finance" },
        { icon: Database, label: "Data Management", path: "/dashboard/data" },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-slate-800/50 flex flex-col h-screen fixed left-0 top-0 z-50 shadow-xl">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl mr-3 shadow-lg shadow-blue-500/20">
          <Globe className="text-white" size={20} />
        </div>
        <span className="font-bold text-white tracking-tight text-lg">
          Neptune<span className="text-slate-400">OS</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        {navSections.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? "mt-6" : ""}>
            <h3 className="text-xs font-bold text-slate-500 px-4 mb-2 tracking-wider">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium group ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={18}
                        className={
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-white transition-colors"
                        }
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-xl space-y-1">
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 w-full px-4 py-2.5 rounded-xl transition-all text-sm font-medium group ${
              isActive
                ? "bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={18}
                className={
                  isActive
                    ? "text-white"
                    : "text-slate-500 group-hover:text-white transition-colors"
                }
              />
              Settings
            </>
          )}
        </NavLink>
        <button
          onClick={() => dispatch(logout())}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-xl transition-all text-sm font-medium group"
        >
          <LogOut
            size={18}
            className="group-hover:scale-110 transition-transform"
          />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
