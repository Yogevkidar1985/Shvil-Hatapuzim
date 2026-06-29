"use client";

import { useState } from "react";
import Modal from "./Modal";
import { api } from "@/app/lib/api-client";
import type { ColumnDefDTO } from "@/app/lib/types";

export default function AddColumnDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (col: ColumnDefDTO) => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!label.trim()) {
      setError("חובה להזין שם עמודה");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { column } = await api.createColumn({
        label: label.trim(),
        type,
        options: type === "select" ? options.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      onAdded(column);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "הוספה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="הוספת עמודה" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">שם העמודה</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            placeholder="למשל: גוש / חלקה / כתובת"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">סוג</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="text">טקסט</option>
            <option value="number">מספר</option>
            <option value="date">תאריך</option>
            <option value="select">בחירה</option>
          </select>
        </div>
        {type === "select" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              אפשרויות (מופרדות בפסיק)
            </label>
            <input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="אופציה 1, אופציה 2"
            />
          </div>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            ביטול
          </button>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? "מוסיף…" : "הוסף עמודה"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
