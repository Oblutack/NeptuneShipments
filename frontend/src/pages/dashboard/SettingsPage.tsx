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
      console.log("🔄 Resetting simulation data...");
      // TODO: Call backend API to reset data
    }
  };

  const handleClearCache = () => {
    if (
      window.confirm("Clear local cache? You may need to refresh the page.")
    ) {
      console.log("🗑️ Clearing local cache...");
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="text-blue-400" size={32} />
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-500">
            Manage your account and preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== SECTION 1: PROFILE ========== */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <User className="text-blue-400" size={20} />
            Profile Information
          </h2>

          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-green-400">
                <CheckCircle2 size={12} />
                Verified
              </div>
            </div>

            {/* User Details */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1 block">
                  Username
                </label>
                <div className="flex items-center gap-2 text-white">
                  <User size={16} className="text-slate-500" />
                  <span className="font-semibold">{user?.full_name}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1 block">
                  Email
                </label>
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail size={16} className="text-slate-500" />
                  <span>{user?.email || "Not provided"}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1 block">
                  Company
                </label>
                <div className="flex items-center gap-2 text-slate-300">
                  <Building size={16} className="text-slate-500" />
                  <span>{user?.company_name || "Neptune Shipping Co."}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1 block">
                  Role
                </label>
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-slate-500" />
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      user?.role === "ADMIN"
                        ? "bg-purple-900/30 text-purple-300 border border-purple-500/50"
                        : "bg-blue-900/30 text-blue-300 border border-blue-500/50"
                    }`}
                  >
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== SECTION 2: APP PREFERENCES ========== */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <SettingsIcon className="text-blue-400" size={20} />
            Preferences
          </h2>

          <div className="space-y-6">
            {/* Unit System Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Ruler size={16} className="text-slate-500" />
                  <span className="text-sm font-semibold text-white">
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
            <div className="pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-slate-500" />
                  <span className="text-sm font-semibold text-white">
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

        {/* ========== SECTION 3: DANGER ZONE ========== */}
        <div className="lg:col-span-3 bg-red-900/10 border border-red-500/50 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
            <AlertTriangle size={20} />
            Danger Zone
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reset Simulation */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <Trash2 size={16} className="text-red-400" />
                Reset Simulation
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Clears all vessels, shipments, and routes. Cannot be undone.
              </p>
              <button
                onClick={handleResetSimulation}
                className="w-full bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                Reset Data
              </button>
            </div>

            {/* Clear Cache */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <Trash2 size={16} className="text-orange-400" />
                Clear Local Cache
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Removes stored preferences and session data. Page will reload.
              </p>
              <button
                onClick={handleClearCache}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-blue-600" : "bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
};
