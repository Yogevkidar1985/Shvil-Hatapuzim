"use client";

import { useState } from "react";
import { clsx } from "clsx";
import * as XLSX from "xlsx";
import Modal from "./Modal";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import { api, type SignerSuggestion } from "@/app/lib/api-client";
import { cellToString } from "@/app/lib/import";

export default function SignersMatchDialog({
  onClose,
  onApplied,
}: {
  onClose: () => void;
  onApplied: () => void;
}) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<SignerSuggestion[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [dragOver, setDragOver] = useState(false);

  async function processFile(file: File) {
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", codepage: 65001 });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const names: string[] = [];
      for (const row of json) {
        const keys = Object.keys(row);
        const nameKey = keys.find((k) => k.includes("שם")) ?? keys[0];
        const v = cellToString(row[nameKey]);
        if (v) names.push(v);
      }
      if (names.length === 0) {
        toast("לא נמצאו שמות בקובץ", "error");
        setLoading(false);
        return;
      }
      const { suggestions } = await api.matchSigners(names);
      setSuggestions(suggestions);
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
      toast("עיבוד הקובץ נכשל: " + (err instanceof Error ? err.message : "שגיאה"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    setLoading(true);
    try {
      const apply = suggestions
        .map((s, i) => ({ s, i }))
        .filter(({ s, i }) => checked[i] && s.holderId)
        .map(({ s, i }) => ({ holderId: s.holderId as string, status: statusMap[i] || "signed" }));
      if (apply.length === 0) {
        toast("לא נבחרו התאמות להחלה", "error");
        setLoading(false);
        return;
      }
      const { applied } = await api.applySigners(apply);
      onApplied();
      onClose();
      toast(`עודכנו ${applied} סטטוסים`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "החלה נכשלה", "error");
    } finally {
      setLoading(false);
    }
  }

  const exactCount = suggestions.filter((s) => s.confidence === "exact").length;
  const fuzzyCount = suggestions.filter((s) => s.confidence === "fuzzy").length;
  const noneCount = suggestions.filter((s) => s.confidence === "none").length;

  return (
    <Modal title="השוואה לטבלת חתומים" subtitle="התאמת VLOOKUP אוטומטית + אישור ידני" icon="✅" onClose={onClose} wide>
      {step === "upload" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 leading-relaxed">
            העלו קובץ Excel/CSV של החתומים. המערכת תתאים את השמות אוטומטית מול בעלי הזכויות.
            <b className="text-slate-700"> התאמות מדויקות</b> יסומנו אוטומטית;
            <b className="text-amber-600"> התאמות משוערות</b> דורשות אישור ידני.
          </p>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
            className={clsx(
              "block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors",
              dragOver ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
            )}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <span className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-500 text-sm">מעבד ומתאים…</span>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-2">📋</div>
                <p className="font-semibold text-slate-700">גררו קובץ חתומים לכאן, או לחצו לבחירה</p>
                <p className="text-sm text-slate-400 mt-1">.xlsx · .xls · .csv</p>
              </>
            )}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap text-sm">
            <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-semibold">✓ {exactCount} מדויקות</span>
            <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg font-semibold">≈ {fuzzyCount} משוערות</span>
            <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg font-semibold">✕ {noneCount} ללא התאמה</span>
          </div>
          <div className="max-h-96 overflow-y-auto border border-slate-100 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-slate-500">
                  <th className="px-3 py-2.5 w-10"></th>
                  <th className="px-3 py-2.5 text-right font-semibold">שם בקובץ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">הותאם ל־</th>
                  <th className="px-3 py-2.5 text-right font-semibold">דיוק</th>
                  <th className="px-3 py-2.5 text-right font-semibold">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s, i) => (
                  <tr key={i} className={clsx("border-t border-slate-100", checked[i] && "bg-brand-50/40")}>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" disabled={!s.holderId} checked={!!checked[i]}
                        onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
                        className="w-4 h-4 accent-brand-600" />
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-700">{s.signerName}</td>
                    <td className="px-3 py-2 text-slate-600">{s.holderName ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2">
                      <ConfBadge confidence={s.confidence} score={s.score} />
                    </td>
                    <td className="px-3 py-2">
                      <select value={statusMap[i] || "signed"} onChange={(e) => setStatusMap((m) => ({ ...m, [i]: e.target.value }))}
                        disabled={!s.holderId}
                        className="focus-ring border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none bg-white">
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
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setStep("upload")}>← קובץ אחר</Button>
            <Button variant="primary" loading={loading} onClick={handleApply}>החל סימון סטטוס</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ConfBadge({ confidence, score }: { confidence: string; score: number }) {
  if (confidence === "exact") return <span className="text-green-600 font-semibold text-xs">מדויק</span>;
  if (confidence === "fuzzy")
    return <span className="text-amber-600 font-semibold text-xs">משוער · {Math.round(score * 100)}%</span>;
  return <span className="text-slate-300 text-xs">לא נמצא</span>;
}
