"use client";

import { clsx } from "clsx";
import Button from "./ui/Button";
import StatCard from "./ui/StatCard";
import Logo from "./ui/Logo";
import { Chip } from "./ui/atoms";
import { PROJECT } from "@/app/lib/project";
import type { HolderDTO } from "@/app/lib/types";

interface Props {
  holders: HolderDTO[];
  search: string;
  onSearch: (v: string) => void;
  selectedCount: number;
  saveState: "idle" | "saving" | "saved" | "error";
  waState: { configured: boolean; state: string | null } | null;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
  onImport: () => void;
  onExport: () => void;
  onAddRow: () => void;
  onAddColumn: () => void;
  onBulkSend: () => void;
  onGroup: () => void;
  onTemplates: () => void;
  onCheckPhones: () => void;
  onSigners: () => void;
  onSync: () => void;
  onLogout: () => void;
}

export default function Toolbar(p: Props) {
  const counts = {
    total: p.holders.length,
    signed: p.holders.filter((h) => h.status === "signed").length,
    pending: p.holders.filter((h) => h.status === "pending").length,
    objected: p.holders.filter((h) => h.status === "objected").length,
    messagesSent: p.holders.reduce((sum, h) => sum + (h.msgStats?.out ?? 0), 0),
    inGroup: p.holders.filter((h) => h.groupStatus === "added").length,
  };

  const waOk = p.waState?.configured && p.waState.state === "authorized";

  return (
    <header className="sticky top-0 z-20">
      {/* באנר עליון — ירוק כהה עם זהב */}
      <div className="bg-gradient-to-l from-brand-800 to-brand-700 text-white px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Logo size={46} />
          <div>
            <h1 className="font-extrabold leading-tight text-lg">{PROJECT.name}</h1>
            <p className="text-[12px] text-white/60 leading-tight">
              תכנית מתאר מקומית {PROJECT.plan} · {PROJECT.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <IdChip label="תכנית" value={PROJECT.plan} />
          <IdChip label="גוש" value={PROJECT.block} />
          <span
            className={clsx(
              "text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5",
              waOk ? "bg-brand-500/30 text-white" : "bg-white/10 text-white/70"
            )}
            title="מצב חיבור WhatsApp (GreenAPI)"
          >
            <span className={clsx("w-2 h-2 rounded-full", waOk ? "bg-green-400" : "bg-amber-400")} />
            WhatsApp {p.waState?.configured ? p.waState.state ?? "?" : "לא מחובר"}
          </span>
          <SaveIndicator state={p.saveState} />
          <button onClick={p.onLogout} className="text-sm text-white/70 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10">
            יציאה ←
          </button>
        </div>
      </div>
      <div className="glass-header border-b border-slate-200/70 pt-3">
      {/* כרטיסי KPI */}
      <div className="px-5 pb-3 flex gap-2.5 flex-wrap">
        <StatCard label="סה״כ בעלי זכויות" value={counts.total} icon="👥" tone="gold"
          active={p.statusFilter === ""} onClick={() => p.onStatusFilter("")} />
        <StatCard label="חתמו" value={counts.signed} icon="✅" tone="green"
          active={p.statusFilter === "signed"} onClick={() => p.onStatusFilter("signed")} />
        <StatCard label="ממתינים" value={counts.pending} icon="⏳" tone="slate"
          active={p.statusFilter === "pending"} onClick={() => p.onStatusFilter("pending")} />
        <StatCard label="התנגדו" value={counts.objected} icon="🚫" tone="red"
          active={p.statusFilter === "objected"} onClick={() => p.onStatusFilter("objected")} />
        <StatCard label="הודעות שנשלחו" value={counts.messagesSent} icon="💬" tone="brand" />
        <StatCard label="בקבוצת WhatsApp" value={counts.inGroup} icon="👥" tone="gold" />
      </div>

      {/* סרגל פעולות */}
      <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
        <div className="relative">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
          <input
            value={p.search}
            onChange={(e) => p.onSearch(e.target.value)}
            placeholder="חיפוש בעל זכויות…"
            className="focus-ring bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-sm w-64 shadow-soft outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Chip active={p.statusFilter === ""} onClick={() => p.onStatusFilter("")} color="slate">הכול</Chip>
          <Chip active={p.statusFilter === "signed"} onClick={() => p.onStatusFilter("signed")} color="green">חתמו</Chip>
          <Chip active={p.statusFilter === "pending"} onClick={() => p.onStatusFilter("pending")} color="slate">ממתינים</Chip>
          <Chip active={p.statusFilter === "objected"} onClick={() => p.onStatusFilter("objected")} color="red">התנגדו</Chip>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <Button variant="secondary" size="sm" icon="＋" onClick={p.onAddRow}>שורה</Button>
        <Button variant="secondary" size="sm" icon="＋" onClick={p.onAddColumn}>עמודה</Button>
        <Button variant="secondary" size="sm" icon="⬆️" onClick={p.onImport}>ייבוא</Button>
        <Button variant="secondary" size="sm" icon="⬇️" onClick={p.onExport}>ייצוא</Button>
        <Button variant="secondary" size="sm" icon="📝" onClick={p.onTemplates} title="ניהול תבניות הודעה">תבניות</Button>
        <Button variant="secondary" size="sm" icon="✅" onClick={p.onSigners}>חתומים</Button>
        <Button variant="secondary" size="sm" icon="🔄" onClick={p.onSync} title="משיכת הודעות נכנסות">סנכרון</Button>
        <Button variant="secondary" size="sm" icon="✔" onClick={p.onCheckPhones} title="בדיקה מול WhatsApp אילו מספרים תקינים">
          בדיקת מספרים
        </Button>

        <div className="flex-1" />

        <Button
          variant="secondary"
          size="md"
          icon="👥"
          disabled={p.selectedCount === 0}
          onClick={p.onGroup}
          title="צירוף הנבחרים לקבוצת WhatsApp"
        >
          קבוצה {p.selectedCount > 0 && `(${p.selectedCount})`}
        </Button>
        <Button
          variant="whatsapp"
          size="md"
          icon="💬"
          disabled={p.selectedCount === 0}
          onClick={p.onBulkSend}
        >
          שליחה לנבחרים {p.selectedCount > 0 && `(${p.selectedCount})`}
        </Button>
      </div>
      </div>
    </header>
  );
}

function IdChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 text-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-gold-300" />
      <span className="text-white/60">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

function SaveIndicator({ state }: { state: Props["saveState"] }) {
  if (state === "idle") return null;
  const map = {
    saving: { t: "שומר…", c: "text-slate-400", d: "bg-slate-300 animate-pulse" },
    saved: { t: "נשמר", c: "text-green-600", d: "bg-green-500" },
    error: { t: "שגיאת שמירה", c: "text-red-600", d: "bg-red-500" },
  } as const;
  const s = map[state];
  return (
    <span className={clsx("text-xs font-medium flex items-center gap-1.5", s.c)} aria-live="polite">
      <span className={clsx("w-2 h-2 rounded-full", s.d)} />
      {s.t}
    </span>
  );
}
