"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { clsx } from "clsx";
import Button from "./Button";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Ctx {
  toast: (message: string, type?: ToastType) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, string> = { success: "✓", error: "!", info: "i" };
const TONE: Record<ToastType, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-slate-700",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve }));
  }, []);

  const closeConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toasts */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-toast-in pointer-events-auto flex items-center gap-3 bg-white shadow-pop border border-slate-100 rounded-xl pr-3 pl-4 py-2.5 min-w-[240px] max-w-md"
          >
            <span
              className={clsx(
                "w-6 h-6 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0",
                TONE[t.type]
              )}
            >
              {ICONS[t.type]}
            </span>
            <p className="text-sm text-slate-700 font-medium">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[101] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => closeConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-pop w-full max-w-sm p-6 animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={clsx(
                "w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4",
                confirmState.danger ? "bg-red-50" : "bg-brand-50"
              )}
            >
              {confirmState.danger ? "🗑️" : "❓"}
            </div>
            <h3 className="text-lg font-bold text-slate-800">{confirmState.title}</h3>
            {confirmState.message && (
              <p className="text-slate-500 mt-1.5 text-sm leading-relaxed">{confirmState.message}</p>
            )}
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="ghost" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel || "ביטול"}
              </Button>
              <Button
                variant={confirmState.danger ? "danger" : "primary"}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel || "אישור"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
