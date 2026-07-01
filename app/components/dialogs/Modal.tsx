"use client";

import { ReactNode, useEffect } from "react";
import { clsx } from "clsx";

export default function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={clsx(
          "bg-white rounded-2xl shadow-pop w-full max-h-[90vh] flex flex-col animate-pop-in",
          wide ? "max-w-3xl" : "max-w-md"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-5 border-b border-slate-100">
          {icon && (
            <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl shrink-0">
              {icon}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800 leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-lg"
          >
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
