"use client";

import { clsx } from "clsx";

interface Props {
  label: string;
  value: number | string;
  icon: string;
  tone?: "brand" | "gold" | "green" | "red" | "slate";
  active?: boolean;
  onClick?: () => void;
}

const tones = {
  brand: { ring: "ring-brand-200", icon: "bg-brand-100 text-brand-700", val: "text-brand-700" },
  gold: { ring: "ring-gold-200", icon: "bg-gold-100 text-gold-700", val: "text-gold-700" },
  green: { ring: "ring-brand-200", icon: "bg-brand-100 text-brand-700", val: "text-brand-700" },
  red: { ring: "ring-red-200", icon: "bg-red-100 text-red-700", val: "text-red-700" },
  slate: { ring: "ring-slate-200", icon: "bg-slate-100 text-slate-600", val: "text-slate-700" },
};

export default function StatCard({ label, value, icon, tone = "slate", active, onClick }: Props) {
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      className={clsx(
        "card flex items-center gap-3 px-4 py-3 text-right transition-all hover:shadow-card min-w-[150px]",
        onClick && "cursor-pointer",
        active && `ring-2 ${t.ring}`
      )}
    >
      <span className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0", t.icon)}>
        {icon}
      </span>
      <div className="leading-tight">
        <div className={clsx("text-2xl font-extrabold tabular-nums", t.val)}>{value}</div>
        <div className="text-xs text-slate-400 font-medium">{label}</div>
      </div>
    </button>
  );
}
