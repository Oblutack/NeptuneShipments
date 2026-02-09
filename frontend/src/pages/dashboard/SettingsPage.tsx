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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* ✨ Modern Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-500 rounded-2xl shadow-lg shadow-slate-500/20">
            <SettingsIcon className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Settings
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage your account and preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ========== SECTION 1: PROFILE ========== */}
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <User className="text-blue-400" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Profile Information
                </h2>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="shrink-0">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/30">
                    {user?.full_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-green-400 bg-green-900/30 px-3 py-1 rounded-xl border border-green-500/30">
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
                      <span>
                        {user?.company_name || "Neptune Shipping Co."}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1 block">
                      Role
                    </label>
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-slate-500" />
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-bold ${
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
          </div>

          {/* ========== SECTION 2: APP PREFERENCES ========== */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <SettingsIcon className="text-purple-400" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">Preferences</h2>
              </div>
            </div>

            <div className="p-6">
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
          </div>
        </div>

        {/* ========== SECTION 3: DANGER ZONE ========== */}
        <div className="lg:col-span-3 bg-red-900/10 backdrop-blur-xl border border-red-500/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-500/30 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="text-red-400" size={20} />
              </div>
              <h2 className="text-xl font-bold text-red-400">Danger Zone</h2>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reset Simulation */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Trash2 size={16} className="text-red-400" />
                  Reset Simulation
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Clears all vessels, shipments, and routes. Cannot be undone.
                </p>
                <button
                  onClick={handleResetSimulation}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-500/20"
                >
                  Reset Data
                </button>
              </div>

              {/* Clear Cache */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Trash2 size={16} className="text-orange-400" />
                  Clear Local Cache
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Removes stored preferences and session data. Page will reload.
                </p>
                <button
                  onClick={handleClearCache}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-500/20"
                >
                  Clear Cache
                </button>
              </div>
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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all shadow-lg ${
        enabled
          ? "bg-gradient-to-r from-blue-600 to-cyan-600 shadow-blue-500/30"
          : "bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
};
