"use client";

import { clsx } from "clsx";
import type { HolderStatus } from "@/app/lib/types";
import { STATUS_LABELS } from "@/app/lib/types";

/** תגית סטטוס צבעונית */
export function StatusBadge({ status }: { status: HolderStatus }) {
  const cls =
    status === "signed" ? "status-signed" : status === "objected" ? "status-objected" : "status-pending";
  return <span className={clsx("status-pill", cls)}>{STATUS_LABELS[status] ?? "ממתין"}</span>;
}

/** אווטאר עם ראשי תיבות */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials =
    (name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("") || "?";
  // צבע יציב לפי שם
  const colors = [
    "from-orange-400 to-orange-600",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-red-500",
    "from-emerald-400 to-green-600",
    "from-sky-400 to-blue-500",
    "from-violet-400 to-purple-600",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const c = colors[h % colors.length];
  return (
    <div
      className={clsx(
        "rounded-full bg-gradient-to-br text-white font-bold flex items-center justify-center shadow-soft shrink-0",
        c
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

/** Spinner */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-block border-2 border-brand-500 border-t-transparent rounded-full animate-spin",
        className || "w-5 h-5"
      )}
    />
  );
}

/** מצב ריק */
export function EmptyState({
  icon = "🍊",
  title,
  subtitle,
  action,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
      <div className="text-5xl mb-3 opacity-90">{icon}</div>
      <h3 className="text-lg font-bold text-slate-700">{title}</h3>
      {subtitle && <p className="text-slate-400 mt-1 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** צ'יפ פילטר */
export function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  color?: "brand" | "green" | "red" | "slate";
}) {
  const activeCls = {
    brand: "bg-brand-600 text-white border-brand-600 shadow-soft",
    green: "bg-green-600 text-white border-green-600 shadow-soft",
    red: "bg-red-600 text-white border-red-600 shadow-soft",
    slate: "bg-slate-700 text-white border-slate-700 shadow-soft",
  }[color || "brand"];
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all",
        active ? activeCls : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}
