"use client";

import { useState } from "react";
import { clsx } from "clsx";
import Modal from "./Modal";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import { api } from "@/app/lib/api-client";
import type { ColumnDefDTO } from "@/app/lib/types";

const TYPES = [
  { value: "text", label: "טקסט", icon: "🔤" },
  { value: "number", label: "מספר", icon: "🔢" },
  { value: "date", label: "תאריך", icon: "📅" },
  { value: "select", label: "בחירה", icon: "📋" },
];

export default function AddColumnDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (col: ColumnDefDTO) => void;
}) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!label.trim()) {
      toast("חובה להזין שם עמודה", "error");
      return;
    }
    setSaving(true);
    try {
      const { column } = await api.createColumn({
        label: label.trim(),
        type,
        options: type === "select" ? options.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      onAdded(column);
      toast("העמודה נוספה", "success");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "הוספה נכשלה", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="הוספת עמודה" subtitle="עמודה חדשה תתווסף לכל השורות" icon="➕" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">שם העמודה</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            className="focus-ring w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
            placeholder="למשל: גוש · חלקה · כתובת"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">סוג העמודה</label>
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={clsx(
                  "flex flex-col items-center gap-1 py-3 rounded-xl border transition-all",
                  type === t.value
                    ? "border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-100"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                )}
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs font-semibold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        {type === "select" && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">אפשרויות (מופרדות בפסיק)</label>
            <input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              className="focus-ring w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
              placeholder="אופציה 1, אופציה 2, אופציה 3"
            />
          </div>
        )}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button variant="primary" loading={saving} onClick={handleAdd}>הוסף עמודה</Button>
        </div>
      </div>
    </Modal>
  );
}
