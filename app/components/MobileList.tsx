"use client";

// תצוגת מובייל — רשימת כרטיסים בגלילת דף אחת טבעית (בלי גלילה פנימית מקוננת).
// הטבלה המלאה (AG Grid) נשארת לדסקטופ בלבד.
import { clsx } from "clsx";
import { Avatar, StatusBadge } from "./ui/atoms";
import { formatPhone, formatDate } from "@/app/lib/format";
import type { HolderDTO } from "@/app/lib/types";

interface Props {
  holders: HolderDTO[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpenContact: (h: HolderDTO) => void;
}

export default function MobileList({ holders, selectedIds, onToggleSelect, onOpenContact }: Props) {
  const selected = new Set(selectedIds);
  if (holders.length === 0) {
    return (
      <div className="text-center text-slate-400 py-16 text-sm">
        אין תוצאות מתאימות לחיפוש או לסינון הנוכחי
      </div>
    );
  }
  return (
    <div className="space-y-2 pb-28">
      {holders.map((h) => {
        const isSel = selected.has(h.id);
        const hasPhone = h.phone.trim() !== "";
        return (
          <div
            key={h.id}
            className={clsx(
              "card px-3.5 py-3 flex items-start gap-3 active:bg-slate-50 transition-colors",
              isSel && "ring-2 ring-brand-300 border-brand-300"
            )}
            onClick={() => onOpenContact(h)}
          >
            <input
              type="checkbox"
              checked={isSel}
              onChange={() => onToggleSelect(h.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`בחירת ${h.name}`}
              className="w-5 h-5 accent-brand-600 mt-1 shrink-0"
            />
            <Avatar name={h.name} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 truncate">{h.name || "— ללא שם —"}</span>
                <StatusBadge status={h.status} />
              </div>
              <div className="flex items-center gap-2 mt-1 text-[13px] text-slate-500 flex-wrap">
                {hasPhone ? (
                  <span className="tabular-nums flex items-center gap-1" dir="ltr">
                    {h.waCheck === "valid" && <span className="text-green-500 text-xs">✔</span>}
                    {h.waCheck === "invalid" && <span className="text-red-500 text-xs">✖</span>}
                    {formatPhone(h.phone)}
                  </span>
                ) : (
                  <span className="text-red-400 font-medium">📞 חסר טלפון</span>
                )}
                {(h.msgStats?.out ?? 0) > 0 && (
                  <span className="bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums">
                    💬 {h.msgStats.out}
                  </span>
                )}
                {h.groupStatus === "added" && (
                  <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                    ✓ בקבוצה
                  </span>
                )}
                {h.phoneAddedAt && (
                  <span className="text-slate-300 text-xs tabular-nums">📅 {formatDate(h.phoneAddedAt)}</span>
                )}
              </div>
            </div>
            <span className="text-slate-300 mt-2">‹</span>
          </div>
        );
      })}
    </div>
  );
}
