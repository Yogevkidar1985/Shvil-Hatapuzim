"use client";

// לוח התקדמות פרויקט — תמונת מצב קבועה: חתימות וטלפונים.
// כל שורה לחיצה: מסננת את הטבלה למי שעוד נשאר לטפל בו.
import { clsx } from "clsx";

interface RowProps {
  icon: string;
  title: string;
  done: number;
  total: number;
  doneLabel: string;
  leftLabel: string;
  tone: "green" | "brand";
  active?: boolean;
  onClick?: () => void;
  hint?: string;
}

const TONE = {
  green: { bar: "from-green-400 to-green-600", text: "text-green-700", chip: "bg-green-50" },
  brand: { bar: "from-brand-400 to-brand-600", text: "text-brand-700", chip: "bg-brand-50" },
} as const;

export function ProgressRow({ icon, title, done, total, doneLabel, leftLabel, tone, active, onClick, hint }: RowProps) {
  const left = Math.max(0, total - done);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const t = TONE[tone];
  return (
    <button
      onClick={onClick}
      title={hint}
      className={clsx(
        "text-right w-full rounded-2xl border px-4 py-3 transition-all bg-white shadow-soft hover:shadow-md",
        active ? "border-brand-400 ring-2 ring-brand-200" : "border-slate-200"
      )}
    >
      <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
        <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
          <span>{icon}</span> {title}
        </span>
        <span className={clsx("text-sm font-extrabold tabular-nums rounded-full px-2.5 py-0.5", t.text, t.chip)}>
          {pct}%
        </span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden" dir="ltr">
        <div
          className={clsx("h-full bg-gradient-to-l rounded-full transition-all duration-500", t.bar)}
          style={{ width: `${pct}%`, marginLeft: "auto" }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500 tabular-nums gap-2 flex-wrap">
        <span>
          <b className={t.text}>{done}</b> {doneLabel}
        </span>
        <span>
          <b className="text-slate-700">{left}</b> {leftLabel}
        </span>
        <span className="text-slate-300">מתוך {total}</span>
      </div>
    </button>
  );
}

interface BoardProps {
  total: number;
  signed: number;
  withPhone: number;
  statusFilter: string;
  phoneFilter: string;
  onStatusFilter: (v: string) => void;
  onPhoneFilter: (v: string) => void;
}

export default function ProgressBoard(p: BoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      <ProgressRow
        icon="✍️"
        title="התקדמות חתימות"
        done={p.signed}
        total={p.total}
        doneLabel="חתמו"
        leftLabel="נשארו לחתימה"
        tone="green"
        active={p.statusFilter === "pending"}
        onClick={() => p.onStatusFilter(p.statusFilter === "pending" ? "" : "pending")}
        hint="לחיצה מציגה את מי שטרם חתם"
      />
      <ProgressRow
        icon="📞"
        title="איסוף טלפונים"
        done={p.withPhone}
        total={p.total}
        doneLabel="עם טלפון"
        leftLabel="חסרי טלפון"
        tone="brand"
        active={p.phoneFilter === "missing"}
        onClick={() => p.onPhoneFilter(p.phoneFilter === "missing" ? "" : "missing")}
        hint="לחיצה מציגה את מי שעוד אין לו מספר טלפון"
      />
    </div>
  );
}
