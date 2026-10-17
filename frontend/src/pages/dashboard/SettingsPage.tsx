import { useState } from "react";
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
  AlertCircle,
  CheckCircle2,
  Trash2,
  Shield,
  ShieldCheck,
  Mail,
  Building,
  Loader2,
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "react-toastify";
import {
  useSetupTOTPMutation,
  useVerifyTOTPMutation,
  useDisableTOTPMutation,
  useResetSimulationMutation,
} from "../../features/api/apiSlice";

export const SettingsPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const preferences = useSelector(selectPreferences);
  const [confirmAction, setConfirmAction] = useState<"reset" | "cache" | null>(
    null,
  );

  const [resetSimulation, { isLoading: isResetting }] =
    useResetSimulationMutation();

  const handleResetSimulation = async () => {
    setConfirmAction(null);
    try {
      await resetSimulation().unwrap();
      toast.success("✅ Simulation reset - all vessels are idle and fueled");
    } catch {
      toast.error("❌ Failed to reset simulation");
    }
  };

  const handleClearCache = () => {
    localStorage.clear();
    window.location.reload();
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

        {/* ========== SECTION 2.5: SECURITY (2FA) ========== */}
        <TwoFactorCard initiallyEnabled={!!user?.totp_enabled} />

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
                  Resets every vessel to idle and fully fueled, and clears
                  all shipments, routes, and berth allocations. Ports, crew,
                  and accounts are untouched. Cannot be undone.
                </p>
                <button
                  onClick={() => setConfirmAction("reset")}
                  disabled={isResetting}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {isResetting ? "Resetting..." : "Reset Data"}
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
                  onClick={() => setConfirmAction("cache")}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmAction === "reset" && (
        <ConfirmDialog
          title="Reset Simulation"
          message="Are you sure you want to reset all simulation data? This action cannot be undone."
          confirmLabel="Reset Data"
          variant="danger"
          onConfirm={handleResetSimulation}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === "cache" && (
        <ConfirmDialog
          title="Clear Local Cache"
          message="Clear local cache? You may need to refresh the page."
          confirmLabel="Clear Cache"
          onConfirm={handleClearCache}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
};

// Two-Factor Authentication Card
const TwoFactorCard = ({ initiallyEnabled }: { initiallyEnabled: boolean }) => {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [stage, setStage] = useState<"idle" | "setup" | "disable">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [setupTOTP, { data: setupData, isLoading: isSettingUp }] =
    useSetupTOTPMutation();
  const [verifyTOTP, { isLoading: isVerifying }] = useVerifyTOTPMutation();
  const [disableTOTP, { isLoading: isDisabling }] = useDisableTOTPMutation();

  const handleStartSetup = async () => {
    setError(null);
    setStage("setup");
    try {
      await setupTOTP().unwrap();
    } catch {
      setError("Failed to start 2FA setup. Please try again.");
      setStage("idle");
    }
  };

  const handleVerify = async () => {
    setError(null);
    try {
      await verifyTOTP({ code }).unwrap();
      setEnabled(true);
      setStage("idle");
      setCode("");
    } catch {
      setError("Invalid code. Please check your authenticator app and try again.");
    }
  };

  const handleDisable = async () => {
    setError(null);
    try {
      await disableTOTP({ code }).unwrap();
      setEnabled(false);
      setStage("idle");
      setCode("");
    } catch {
      setError("Invalid code.");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="border-b border-slate-800 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-slate-500" size={16} />
          <h2 className="text-sm font-semibold text-white">
            Two-Factor Authentication
          </h2>
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3 rounded-md mb-4">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {stage === "idle" && !enabled && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400 max-w-md">
              Add an extra layer of security to your account with a TOTP
              authenticator app (Google Authenticator, Authy, 1Password...).
            </p>
            <button
              onClick={handleStartSetup}
              disabled={isSettingUp}
              className="shrink-0 ml-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              Enable 2FA
            </button>
          </div>
        )}

        {stage === "idle" && enabled && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-md">
              <CheckCircle2 size={16} />
              Two-factor authentication is enabled
            </div>
            <button
              onClick={() => setStage("disable")}
              className="shrink-0 ml-4 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Disable 2FA
            </button>
          </div>
        )}

        {stage === "setup" && (
          <div className="space-y-4">
            {isSettingUp || !setupData ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="animate-spin text-blue-400" size={20} />
                <span className="text-slate-400 text-sm">
                  Generating your 2FA secret...
                </span>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400">
                  Scan this QR code with your authenticator app, or enter the
                  key manually.
                </p>
                <div className="flex items-start gap-5">
                  {setupData.qr_image && (
                    <img
                      src={setupData.qr_image}
                      alt="2FA setup QR code"
                      className="w-36 h-36 rounded-md border border-slate-800 bg-white p-2"
                    />
                  )}
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1 block">
                        Manual Entry Key
                      </label>
                      <code className="block text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 break-all">
                        {setupData.secret}
                      </code>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        Enter the 6-digit code to confirm
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="123456"
                        className="w-full max-w-[160px] bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStage("idle");
                      setCode("");
                      setError(null);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying || code.length !== 6}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isVerifying ? "Verifying..." : "Verify & Enable"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {stage === "disable" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Enter your current 2FA code to confirm disabling two-factor
              authentication.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full max-w-[160px] bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStage("idle");
                  setCode("");
                  setError(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                disabled={isDisabling || code.length !== 6}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isDisabling ? "Disabling..." : "Confirm Disable"}
              </button>
            </div>
          </div>
        )}
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
