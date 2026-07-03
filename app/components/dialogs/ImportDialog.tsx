"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Modal from "./Modal";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import { api } from "@/app/lib/api-client";
import { autoMapHeaders, cellToString } from "@/app/lib/import";

const TARGET_OPTIONS = [
  { value: "", label: "— התעלם —" },
  { value: "name", label: "בעל הזכויות" },
  { value: "relativeValue", label: "שווי יחסי" },
  { value: "state", label: "מצב" },
  { value: "balancePay", label: "תשלומי איזון — משלם" },
  { value: "balanceReceive", label: "תשלומי איזון — מקבל" },
  { value: "phone", label: "טלפון" },
  { value: "status", label: "סטטוס חתימה" },
  { value: "notes", label: "הערות" },
];

export default function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [replace, setReplace] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function processFile(file: File) {
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", codepage: 65001, raw: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
      if (json.length === 0) {
        toast("הקובץ ריק או ללא שורות נתונים", "error");
        return;
      }
      const cleaned = json.map((r) => {
        const o: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) o[k] = cellToString(v);
        return o;
      });
      const hdrs = Object.keys(cleaned[0]);
      setRows(cleaned);
      setHeaders(hdrs);
      setMapping(autoMapHeaders(hdrs));
    } catch (err) {
      toast("קריאת הקובץ נכשלה: " + (err instanceof Error ? err.message : "שגיאה"), "error");
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const { count } = await api.importRows(rows, mapping, replace);
      onImported();
      onClose();
      toast(`יובאו ${count} שורות בהצלחה`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "ייבוא נכשל", "error");
    } finally {
      setImporting(false);
    }
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <Modal title="ייבוא קובץ" subtitle="Excel · CSV — מיפוי אוטומטי עם שמירת דיוק 1:1" icon="⬆️" onClose={onClose} wide>
      <div className="space-y-4">
        {headers.length === 0 ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) processFile(f);
            }}
            className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
            }`}
          >
            <div className="text-4xl mb-2">📄</div>
            <p className="font-semibold text-slate-700">גררו קובץ לכאן, או לחצו לבחירה</p>
            <p className="text-sm text-slate-400 mt-1">קבצי .xlsx · .xls · .csv</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            />
          </label>
        ) : (
          <>
            <div className="flex items-center gap-3 bg-brand-50 rounded-xl p-3 text-sm">
              <span className="text-xl">📄</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-700">{fileName}</p>
                <p className="text-slate-500">
                  {rows.length} שורות · {headers.length} עמודות · {mappedCount} ממופות
                </p>
              </div>
              <button onClick={() => { setHeaders([]); setRows([]); setFileName(""); }} className="text-brand-600 text-sm hover:underline">
                החלף קובץ
              </button>
            </div>

            <div>
              <h3 className="font-semibold text-slate-700 mb-2 text-sm">מיפוי עמודות</h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pl-1">
                {headers.map((h) => (
                  <div key={h} className="flex items-center gap-2">
                    <span className="flex-1 text-sm bg-slate-100 rounded-lg px-3 py-2 truncate" title={h}>{h}</span>
                    <span className="text-slate-300">←</span>
                    <select
                      value={mapping[h] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                      className="focus-ring flex-1 border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none bg-white"
                    >
                      {TARGET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                      <option value={h}>➕ עמודה חדשה: {h}</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-700 mb-2 text-sm">תצוגה מקדימה</h3>
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="text-xs w-full">
                  <thead className="bg-slate-50">
                    <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-right whitespace-nowrap font-semibold text-slate-500">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {headers.map((h) => <td key={h} className="px-3 py-1.5 whitespace-nowrap text-slate-600">{String(r[h] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm bg-slate-50 rounded-xl px-3.5 py-2.5 cursor-pointer">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="w-4 h-4 accent-brand-600" />
              <span className="text-slate-600">החלף את כל הנתונים הקיימים (אחרת — הוספה לרשימה)</span>
            </label>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={onClose}>ביטול</Button>
              <Button variant="primary" loading={importing} disabled={mappedCount === 0} onClick={handleImport}>
                ייבא {rows.length} שורות
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
