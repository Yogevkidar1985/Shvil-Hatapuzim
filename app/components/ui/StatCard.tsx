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
  brand: { icon: "bg-brand-50 text-brand-700", val: "text-slate-900", ring: "ring-brand-500/30", bar: "bg-brand-500" },
  gold: { icon: "bg-gold-100 text-gold-700", val: "text-slate-900", ring: "ring-gold-500/30", bar: "bg-gold-500" },
  green: { icon: "bg-brand-50 text-brand-700", val: "text-slate-900", ring: "ring-brand-500/30", bar: "bg-brand-500" },
  red: { icon: "bg-red-50 text-red-600", val: "text-slate-900", ring: "ring-red-400/30", bar: "bg-red-500" },
  slate: { icon: "bg-slate-100 text-slate-500", val: "text-slate-900", ring: "ring-slate-400/30", bar: "bg-slate-400" },
};

export default function StatCard({ label, value, icon, tone = "slate", active, onClick }: Props) {
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      className={clsx(
        "group relative flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-right transition-all duration-200 min-w-[156px] overflow-hidden",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.08)]",
        active ? `ring-2 ${t.ring} shadow-[0_4px_8px_-2px_rgba(16,24,40,0.08)]` : "shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
      )}
    >
      {/* פס מבטא עליון עדין כשפעיל */}
      <span className={clsx("absolute inset-x-0 top-0 h-0.5 transition-opacity", t.bar, active ? "opacity-100" : "opacity-0")} />
      <span className={clsx("w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0", t.icon)}>{icon}</span>
      <div className="leading-tight">
        <div className={clsx("text-[22px] font-bold tabular-nums tracking-tight", t.val)}>{value}</div>
        <div className="text-xs text-slate-400 font-medium">{label}</div>
      </div>
    </button>
  );
}
