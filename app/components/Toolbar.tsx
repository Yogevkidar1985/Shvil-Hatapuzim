"use client";

interface Props {
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
  onSigners: () => void;
  onSync: () => void;
  onLogout: () => void;
}

export default function Toolbar(p: Props) {
  const saveLabel =
    p.saveState === "saving"
      ? "שומר…"
      : p.saveState === "saved"
        ? "✓ נשמר"
        : p.saveState === "error"
          ? "⚠️ שגיאת שמירה"
          : "";

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍊</span>
          <div>
            <h1 className="font-bold text-orange-900 leading-tight">בעלי זכויות</h1>
            <p className="text-xs text-slate-400 leading-tight">שביל התפוזים · הוד השרון</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* סטטוס WhatsApp */}
          {p.waState && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                p.waState.configured && p.waState.state === "authorized"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
              title="מצב חיבור GreenAPI"
            >
              WhatsApp: {p.waState.configured ? p.waState.state ?? "?" : "לא מוגדר"}
            </span>
          )}
          {saveLabel && (
            <span className="text-xs text-slate-500" aria-live="polite">
              {saveLabel}
            </span>
          )}
          <button onClick={p.onLogout} className="text-xs text-slate-500 hover:text-slate-800">
            יציאה
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <input
          value={p.search}
          onChange={(e) => p.onSearch(e.target.value)}
          placeholder="🔍 חיפוש גלובלי…"
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:ring-2 focus:ring-orange-400 outline-none"
        />
        <select
          value={p.statusFilter}
          onChange={(e) => p.onStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="">כל הסטטוסים</option>
          <option value="pending">ממתין</option>
          <option value="signed">חתם</option>
          <option value="objected">התנגד</option>
        </select>

        <div className="h-5 w-px bg-slate-200" />

        <TBtn onClick={p.onAddRow}>＋ שורה</TBtn>
        <TBtn onClick={p.onAddColumn}>＋ עמודה</TBtn>
        <TBtn onClick={p.onImport}>⬆️ ייבוא</TBtn>
        <TBtn onClick={p.onExport}>⬇️ ייצוא Excel</TBtn>
        <TBtn onClick={p.onSigners}>✓ השוואת חתומים</TBtn>
        <TBtn onClick={p.onSync} title="משיכת הודעות נכנסות מ-WhatsApp">
          🔄 סנכרון WhatsApp
        </TBtn>

        <div className="flex-1" />

        <button
          onClick={p.onBulkSend}
          disabled={p.selectedCount === 0}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
        >
          💬 שלח לנבחרים {p.selectedCount > 0 && `(${p.selectedCount})`}
        </button>
      </div>
    </div>
  );
}

function TBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="text-sm bg-slate-50 hover:bg-orange-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg"
    >
      {children}
    </button>
  );
}
