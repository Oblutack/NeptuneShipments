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
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-50">
      {/* Brand */}
      <div className="h-14 flex items-center px-5 border-b border-slate-800">
        <div className="p-1.5 bg-blue-600 rounded-md mr-2.5">
          <Globe className="text-white" size={16} />
        </div>
        <span className="font-semibold text-white tracking-tight text-[15px]">
          Neptune<span className="text-slate-500">OS</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 overflow-y-auto">
        {navSections.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? "mt-5" : ""}>
            <h3 className="text-[10px] font-semibold text-slate-600 px-3 mb-1.5 tracking-wider">
              {section.title}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-sm font-medium border-l-2 ${
                      isActive
                        ? "bg-blue-500/10 text-white border-blue-500"
                        : "text-slate-400 hover:bg-slate-900 hover:text-white border-transparent"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={16}
                        className={
                          isActive
                            ? "text-blue-400"
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
      <div className="p-3 border-t border-slate-800 space-y-0.5">
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 w-full px-3 py-2 rounded-md transition-colors text-sm font-medium ${
              isActive
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={16}
                className={isActive ? "text-white" : "text-slate-500"}
              />
              Settings
            </>
          )}
        </NavLink>
        <button
          onClick={() => dispatch(logout())}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
