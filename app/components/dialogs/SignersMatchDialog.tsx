"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Modal from "./Modal";
import { api, type SignerSuggestion } from "@/app/lib/api-client";
import { cellToString } from "@/app/lib/import";

// שלב 2: ייבוא טבלת חתומים, התאמת VLOOKUP, וסימון סטטוס לאחר אישור.
export default function SignersMatchDialog({
  onClose,
  onApplied,
}: {
  onClose: () => void;
  onApplied: () => void;
}) {
  const [suggestions, setSuggestions] = useState<SignerSuggestion[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "review">("upload");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", codepage: 65001 });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      // ניקח את העמודה הראשונה כשם החתום (או עמודה בשם שמכיל "שם")
      const names: string[] = [];
      for (const row of json) {
        const keys = Object.keys(row);
        const nameKey = keys.find((k) => k.includes("שם")) ?? keys[0];
        const v = cellToString(row[nameKey]);
        if (v) names.push(v);
      }
      if (names.length === 0) {
        setError("לא נמצאו שמות בקובץ");
        setLoading(false);
        return;
      }
      const { suggestions } = await api.matchSigners(names);
      setSuggestions(suggestions);
      // ברירת מחדל: סמן התאמות exact, סטטוס signed
      const initChecked: Record<number, boolean> = {};
      const initStatus: Record<number, string> = {};
      suggestions.forEach((s, i) => {
        initChecked[i] = s.confidence === "exact" && !!s.holderId;
        initStatus[i] = "signed";
      });
      setChecked(initChecked);
      setStatusMap(initStatus);
      setStep("review");
    } catch (err) {
      setError("עיבוד הקובץ נכשל: " + (err instanceof Error ? err.message : "שגיאה"));
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    setLoading(true);
    setError("");
    try {
      const apply = suggestions
        .map((s, i) => ({ s, i }))
        .filter(({ s, i }) => checked[i] && s.holderId)
        .map(({ s, i }) => ({ holderId: s.holderId as string, status: statusMap[i] || "signed" }));
      if (apply.length === 0) {
        setError("לא נבחרו התאמות להחלה");
        setLoading(false);
        return;
      }
      const { applied } = await api.applySigners(apply);
      onApplied();
      onClose();
      alert(`עודכנו ${applied} סטטוסים`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "החלה נכשלה");
    } finally {
      setLoading(false);
    }
  }

  const confColor = (c: string) =>
    c === "exact" ? "text-green-600" : c === "fuzzy" ? "text-amber-600" : "text-slate-400";
  const confLabel = (c: string) =>
    c === "exact" ? "מדויק" : c === "fuzzy" ? "משוער — לאישור" : "לא נמצא";

  return (
    <Modal title="השוואה לטבלת חתומים (VLOOKUP)" onClose={onClose} wide>
      {step === "upload" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            העלו קובץ Excel/CSV של החתומים. המערכת תתאים את השמות אוטומטית מול בעלי הזכויות
            ותציע סימון סטטוס. התאמות מדויקות יסומנו אוטומטית; התאמות משוערות דורשות אישור ידני.
          </p>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="block mx-auto text-sm" />
          </div>
          {loading && <p className="text-center text-slate-400">מעבד…</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            זוהו {suggestions.length} שמות. בחרו אילו התאמות להחיל וסטטוס לכל אחת.
          </div>
          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="px-2 py-2 w-10"></th>
                  <th className="px-2 py-2 text-right">שם בקובץ החתומים</th>
                  <th className="px-2 py-2 text-right">הותאם לבעל זכויות</th>
                  <th className="px-2 py-2 text-right">דיוק</th>
                  <th className="px-2 py-2 text-right">סטטוס להחלה</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        disabled={!s.holderId}
                        checked={!!checked[i]}
                        onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
                      />
                    </td>
                    <td className="px-2 py-1.5">{s.signerName}</td>
                    <td className="px-2 py-1.5">{s.holderName ?? "—"}</td>
                    <td className={`px-2 py-1.5 ${confColor(s.confidence)}`}>
                      {confLabel(s.confidence)} {s.confidence !== "none" && `(${Math.round(s.score * 100)}%)`}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={statusMap[i] || "signed"}
                        onChange={(e) => setStatusMap((m) => ({ ...m, [i]: e.target.value }))}
                        disabled={!s.holderId}
                        className="border border-slate-300 rounded px-2 py-1 text-xs"
                      >
                        <option value="signed">חתם</option>
                        <option value="objected">התנגד</option>
                        <option value="pending">ממתין</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              ביטול
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? "מחיל…" : "החל סימון סטטוס"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
