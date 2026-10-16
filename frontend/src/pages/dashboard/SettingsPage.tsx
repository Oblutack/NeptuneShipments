import { useDispatch, useSelector } from "react-redux";
import { selectCurrentUser } from "../../features/auth/authSlice";
import {
  selectPreferences,
  toggleUnits,
  toggleNotifications,
} from "../../features/preferences/preferencesSlice";
import {
  User,
  Settings as SettingsIcon,
  Bell,
  Ruler,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Shield,
  Mail,
  Building,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";

export const SettingsPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const preferences = useSelector(selectPreferences);

  const handleResetSimulation = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all simulation data? This action cannot be undone.",
      )
    ) {
      console.log("Resetting simulation data...");
      // TODO: Call backend API to reset data
    }
  };

  const handleClearCache = () => {
    if (
      window.confirm("Clear local cache? You may need to refresh the page.")
    ) {
      console.log("Clearing local cache...");
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <>
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        subtitle="Manage your account and preferences"
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ========== SECTION 1: PROFILE ========== */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <User className="text-slate-500" size={16} />
                <h2 className="text-sm font-semibold text-white">
                  Profile Information
                </h2>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-start gap-5">
                {/* Avatar */}
                <div className="shrink-0">
                  <div className="w-20 h-20 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-300 text-2xl font-semibold">
                    {user?.full_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                    <CheckCircle2 size={12} />
                    Verified
                  </div>
                </div>

                {/* User Details */}
                <div className="flex-1 space-y-3.5">
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1 block">
                      Username
                    </label>
                    <div className="flex items-center gap-2 text-white">
                      <User size={15} className="text-slate-500" />
                      <span className="font-medium text-sm">
                        {user?.full_name}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1 block">
                      Email
                    </label>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Mail size={15} className="text-slate-500" />
                      <span>{user?.email || "Not provided"}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1 block">
                      Company
                    </label>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Building size={15} className="text-slate-500" />
                      <span>
                        {user?.company_name || "Neptune Shipping Co."}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1 block">
                      Role
                    </label>
                    <div className="flex items-center gap-2">
                      <Shield size={15} className="text-slate-500" />
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          user?.role === "ADMIN"
                            ? "bg-purple-500/10 text-purple-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {user?.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========== SECTION 2: APP PREFERENCES ========== */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <SettingsIcon className="text-slate-500" size={16} />
                <h2 className="text-sm font-semibold text-white">
                  Preferences
                </h2>
              </div>
            </div>

            <div className="p-5">
              <div className="space-y-5">
                {/* Unit System Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Ruler size={15} className="text-slate-500" />
                      <span className="text-sm font-medium text-white">
                        Unit System
                      </span>
                    </div>
                    <ToggleSwitch
                      enabled={preferences.units === "IMPERIAL"}
                      onChange={() => dispatch(toggleUnits())}
                    />
                  </div>
                  <p className="text-xs text-slate-500 ml-6">
                    {preferences.units === "METRIC"
                      ? "Metric (kg, km, liters)"
                      : "Imperial (lbs, miles, gallons)"}
                  </p>
                </div>

                {/* Notifications Toggle */}
                <div className="pt-5 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className="text-slate-500" />
                      <span className="text-sm font-medium text-white">
                        Real-time Alerts
                      </span>
                    </div>
                    <ToggleSwitch
                      enabled={preferences.notificationsEnabled}
                      onChange={() => dispatch(toggleNotifications())}
                    />
                  </div>
                  <p className="text-xs text-slate-500 ml-6">
                    {preferences.notificationsEnabled
                      ? "Notifications are enabled"
                      : "Notifications are disabled"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== SECTION 3: DANGER ZONE ========== */}
        <div className="bg-slate-900 border-l-2 border-red-500 rounded-lg overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-400" size={16} />
              <h2 className="text-sm font-semibold text-red-400">
                Danger Zone
              </h2>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Reset Simulation */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <h3 className="font-medium text-white text-sm mb-1.5 flex items-center gap-2">
                  <Trash2 size={14} className="text-red-400" />
                  Reset Simulation
                </h3>
                <p className="text-xs text-slate-500 mb-3.5">
                  Clears all vessels, shipments, and routes. Cannot be undone.
                </p>
                <button
                  onClick={handleResetSimulation}
                  className="w-full bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Reset Data
                </button>
              </div>

              {/* Clear Cache */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <h3 className="font-medium text-white text-sm mb-1.5 flex items-center gap-2">
                  <Trash2 size={14} className="text-orange-400" />
                  Clear Local Cache
                </h3>
                <p className="text-xs text-slate-500 mb-3.5">
                  Removes stored preferences and session data. Page will reload.
                </p>
                <button
                  onClick={handleClearCache}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Toggle Switch Component
const ToggleSwitch = ({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) => {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? "bg-blue-600" : "bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
};
