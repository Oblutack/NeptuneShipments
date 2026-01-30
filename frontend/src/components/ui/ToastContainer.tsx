import { useSelector, useDispatch } from "react-redux";
import {
  selectAlerts,
  removeAlert,
} from "../../features/notifications/notificationsSlice";
import { X, AlertTriangle, Info, Ship } from "lucide-react";
import { useEffect } from "react";

export const ToastContainer = () => {
  const alerts = useSelector(selectAlerts);
  const dispatch = useDispatch();

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 w-96 max-w-[90vw]">
      {alerts.slice(0, 5).map((alert) => (
        <Toast
          key={alert.id}
          alert={alert}
          onDismiss={() => dispatch(removeAlert(alert.id))}
        />
      ))}
    </div>
  );
};

interface ToastProps {
  alert: {
    id: string;
    level: "CRITICAL" | "INFO";
    message: string;
    vessel_name: string;
    timestamp: string;
  };
  onDismiss: () => void;
}

const Toast = ({ alert, onDismiss }: ToastProps) => {
  const isCritical = alert.level === "CRITICAL";

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`
        animate-in slide-in-from-right duration-300
        bg-slate-900 border rounded-lg shadow-2xl p-4
        ${isCritical ? "border-red-500/70" : "border-blue-500/70"}
        hover:scale-105 transition-transform
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <AlertTriangle className="text-red-400 animate-pulse" size={20} />
          ) : (
            <Info className="text-blue-400" size={20} />
          )}
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isCritical ? "text-red-400" : "text-blue-400"
            }`}
          >
            {alert.level}
          </span>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-white transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Message */}
      <p className="text-sm text-white mb-3">{alert.message}</p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Ship size={12} />
          <span>{alert.vessel_name}</span>
        </div>
        <span className="text-slate-600">
          {new Date(alert.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};
