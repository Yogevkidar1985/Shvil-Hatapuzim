"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Modal from "./Modal";
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
  { value: "notes", label: "הערות" },
];

export default function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    try {
      const buf = await file.arrayBuffer();
      // codepage 65001 = UTF-8, raw לשמירת ערכים מדויקים
      const wb = XLSX.read(buf, { type: "array", codepage: 65001, raw: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: true,
      });
      if (json.length === 0) {
        setError("הקובץ ריק או ללא שורות נתונים");
        return;
      }
      // נקה ערכים למחרוזות מדויקות
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
      setError("קריאת הקובץ נכשלה: " + (err instanceof Error ? err.message : "שגיאה"));
    }
  }

  async function handleImport() {
    setImporting(true);
    setError("");
    try {
      const { count } = await api.importRows(rows, mapping, replace);
      onImported();
      onClose();
      alert(`יובאו ${count} שורות בהצלחה`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ייבוא נכשל");
    } finally {
      setImporting(false);
    }
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <Modal title="ייבוא קובץ (Excel / CSV)" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="block mx-auto text-sm"
          />
          {fileName && <p className="text-sm text-slate-500 mt-2">{fileName}</p>}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {headers.length > 0 && (
          <>
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p>
                זוהו <b>{rows.length}</b> שורות ו-<b>{headers.length}</b> עמודות.{" "}
                <b>{mappedCount}</b> ממופות.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-700 mb-2">מיפוי עמודות</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {headers.map((h) => (
                  <div key={h} className="flex items-center gap-2">
                    <span className="flex-1 text-sm bg-slate-100 rounded px-2 py-1.5 truncate" title={h}>
                      {h}
                    </span>
                    <span className="text-slate-400">←</span>
                    <select
                      value={mapping[h] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                      className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                      {TARGET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {/* אפשרות לעמודה דינמית חדשה בשם הכותרת */}
                      <option value={h}>עמודה חדשה: {h}</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* תצוגה מקדימה */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">תצוגה מקדימה (5 שורות ראשונות)</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="text-xs w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="px-2 py-1 text-right whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {headers.map((h) => (
                          <td key={h} className="px-2 py-1 whitespace-nowrap">
                            {String(r[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              החלף את כל הנתונים הקיימים (אחרת — הוספה)
            </label>

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                ביטול
              </button>
              <button
                onClick={handleImport}
                disabled={importing || mappedCount === 0}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50"
              >
                {importing ? "מייבא…" : `ייבא ${rows.length} שורות`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
