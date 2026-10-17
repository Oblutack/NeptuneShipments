import { useState } from "react";
import { useLoginMutation } from "../features/api/apiSlice";
import { useDispatch } from "react-redux";
import { setCredentials } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Loader2, Globe, AlertCircle, ShieldCheck } from "lucide-react";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const userData = await login({
        email,
        password,
        ...(needsTotp && totpCode ? { totp_code: totpCode } : {}),
      }).unwrap();

      dispatch(setCredentials(userData));
      navigate(userData.user.role === "CLIENT" ? "/portal" : "/dashboard");
    } catch (err) {
      console.error("Login Error:", err);
      const apiError = err as { data?: { error?: string; totp_required?: boolean } };
      if (apiError?.data?.totp_required) {
        setNeedsTotp(true);
        setError(
          needsTotp ? "Invalid code. Try again." : null,
        );
        return;
      }
      setError("Login failed. Check your credentials and try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-2.5 bg-blue-600 rounded-lg">
              <Globe className="text-white" size={24} />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-white mb-1">
            Welcome Back
          </h1>
          <p className="text-slate-500 text-sm">Sign in to Neptune Command</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3 rounded-md">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!needsTotp ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    size={16}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="admin@neptune.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    size={16}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Two-Factor Code
              </label>
              <div className="relative">
                <ShieldCheck
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  maxLength={6}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors tracking-widest"
                  placeholder="123456"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : needsTotp ? (
              "Verify"
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
