import { useState } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDanger = variant === "danger";

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      const apiError = err as { data?: { error?: string }; message?: string };
      setError(
        apiError?.data?.error || apiError?.message || "Something went wrong. Please try again.",
      );
      setIsProcessing(false);
      return;
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center gap-2.5 mb-3">
          {isDanger && <AlertTriangle size={18} className="text-red-400" />}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6">{message}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-2">
            <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              setIsProcessing(true);
              handleConfirm();
            }}
            disabled={isProcessing}
            className={`flex-1 text-white text-sm px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isDanger ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
