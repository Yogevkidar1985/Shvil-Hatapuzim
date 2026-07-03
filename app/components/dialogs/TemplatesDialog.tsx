"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import Modal from "./Modal";
import Button from "../ui/Button";
import { Spinner } from "../ui/atoms";
import { useToast } from "../ui/Toast";
import { api } from "@/app/lib/api-client";
import { TEMPLATE_VARS } from "@/app/lib/template";
import type { TemplateDTO } from "@/app/lib/types";

interface Props {
  onClose: () => void;
  onChange: (templates: TemplateDTO[]) => void;
}

export default function TemplatesDialog({ onClose, onChange }: Props) {
  const { toast, confirm } = useToast();
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TemplateDTO | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    setLoading(true);
    try {
      const { templates } = await api.listTemplates();
      setTemplates(templates);
      onChange(templates);
    } catch {
      toast("טעינת התבניות נכשלה", "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    setEditing(null);
    setName("");
    setBody("");
  }
  function startEdit(t: TemplateDTO) {
    setEditing(t);
    setName(t.name);
    setBody(t.body);
  }

  function insertVar(token: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  async function save() {
    if (!name.trim() || !body.trim()) {
      toast("חובה שם ותוכן", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updateTemplate(editing.id, { name: name.trim(), body: body.trim() });
        toast("התבנית עודכנה", "success");
      } else {
        await api.createTemplate(name.trim(), body.trim());
        toast("התבנית נוספה", "success");
      }
      await load();
      startNew();
    } catch (e) {
      toast(e instanceof Error ? e.message : "שמירה נכשלה", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: TemplateDTO) {
    const ok = await confirm({ title: `מחיקת התבנית "${t.name}"`, confirmLabel: "מחק", danger: true });
    if (!ok) return;
    try {
      await api.deleteTemplate(t.id);
      if (editing?.id === t.id) startNew();
      await load();
      toast("התבנית נמחקה", "success");
    } catch {
      toast("מחיקה נכשלה", "error");
    }
  }

  return (
    <Modal title="תבניות הודעה" subtitle="צרו ונהלו תבניות מוכנות לשליחה מהירה" icon="📝" onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* רשימת תבניות */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-700 text-sm">התבניות שלי</h3>
            <button onClick={startNew} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              ＋ תבנית חדשה
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">אין תבניות עדיין — צרו את הראשונה ←</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pl-1">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={clsx(
                    "rounded-xl border p-3 cursor-pointer transition-all group",
                    editing?.id === t.id ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:bg-slate-50"
                  )}
                  onClick={() => startEdit(t)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700 text-sm truncate">{t.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(t); }}
                      className="text-slate-300 hover:text-red-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      title="מחק"
                    >
                      🗑️
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* עורך */}
        <div className="md:border-r md:pr-5 border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm mb-2">
            {editing ? "עריכת תבנית" : "תבנית חדשה"}
          </h3>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם התבנית (למשל: תזכורת חתימה)"
              className="focus-ring w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none"
            />
            <div>
              <div className="flex gap-1.5 flex-wrap mb-1.5">
                {TEMPLATE_VARS.map((v) => (
                  <button
                    key={v.token}
                    onClick={() => insertVar(v.token)}
                    className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-100 font-medium"
                    title={`הוסף ${v.token}`}
                  >
                    ＋ {v.label}
                  </button>
                ))}
              </div>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="שלום {שם}, ..."
                className="focus-ring w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">לחצו על משתנה כדי לשלב אותו במיקום הסמן.</p>
            </div>
            <div className="flex gap-2 justify-end">
              {editing && <Button variant="ghost" onClick={startNew}>ביטול עריכה</Button>}
              <Button variant="primary" loading={saving} onClick={save}>
                {editing ? "שמור שינויים" : "הוסף תבנית"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
