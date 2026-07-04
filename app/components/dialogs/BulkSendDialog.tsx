"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import Modal from "./Modal";
import Button from "../ui/Button";
import { Avatar } from "../ui/atoms";
import { api, type DuplicateCheck } from "@/app/lib/api-client";
import { renderTemplate } from "@/app/lib/template";
import { useTemplates } from "@/app/lib/useTemplates";
import { isValidIsraeliPhone } from "@/app/lib/phone";
import type { HolderDTO } from "@/app/lib/types";

interface Props {
  holders: HolderDTO[];
  onClose: () => void;
  onDone: () => void;
}

type SendStatus = "pending" | "sending" | "ok" | "failed" | "skipped";

interface Recipient {
  holder: HolderDTO;
  validPhone: boolean;
  included: boolean;
  status: SendStatus;
  error?: string;
  sentCount: number; // כמה הודעות קיבל בעבר
  duplicate: boolean; // האם התוכן הנוכחי כבר נשלח לו
}

const THROTTLE_MS = 3000;

export default function BulkSendDialog({ holders, onClose, onDone }: Props) {
  const { templates } = useTemplates();
  const [template, setTemplate] = useState("");
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>(() =>
    holders.map((h) => {
      const validPhone = isValidIsraeliPhone(h.phone);
      return {
        holder: h,
        validPhone,
        included: validPhone && h.waCheck !== "invalid",
        status: (validPhone ? "pending" : "skipped") as SendStatus,
        error: validPhone ? undefined : "אין טלפון תקין",
        sentCount: h.msgStats?.out ?? 0,
        duplicate: false,
      };
    })
  );
  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // בדיקת כפילויות מול השרת — בכל שינוי תבנית (debounce)
  const refreshDuplicates = useCallback(
    (tpl: string) => {
      if (dupTimer.current) clearTimeout(dupTimer.current);
      dupTimer.current = setTimeout(async () => {
        try {
          const ids = holders.map((h) => h.id);
          const { checks } = await api.checkDuplicates(ids, tpl);
          const map = new Map<string, DuplicateCheck>(checks.map((c) => [c.holderId, c]));
          setRecipients((prev) =>
            prev.map((r) => {
              const c = map.get(r.holder.id);
              return c ? { ...r, sentCount: c.sentCount, duplicate: c.duplicate } : r;
            })
          );
        } catch {
          /* בדיקת כפילויות היא עזר — לא חוסמת */
        }
      }, 500);
    },
    [holders]
  );

  // אתחול תוכן ההודעה מהתבנית הראשונה כשהתבניות נטענות
  useEffect(() => {
    if (!template && templates.length > 0) {
      setTemplate(templates[0].body);
      setTemplateName(templates[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  useEffect(() => {
    refreshDuplicates(template);
    return () => {
      if (dupTimer.current) clearTimeout(dupTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const included = recipients.filter((r) => r.included && r.validPhone);
  const duplicates = recipients.filter((r) => r.included && r.validPhone && r.duplicate);
  const sentOk = recipients.filter((r) => r.status === "ok").length;
  const failed = recipients.filter((r) => r.status === "failed").length;
  const done = sentOk + failed;
  const progress = included.length ? Math.round((done / included.length) * 100) : 0;

  const previewHolder = included[0]?.holder ?? holders[0];
  const preview = previewHolder ? renderTemplate(template, previewHolder) : "";

  const excludeDuplicates = () => {
    setRecipients((prev) => prev.map((r) => (r.duplicate ? { ...r, included: false } : r)));
  };

  const toggle = (holderId: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.holder.id === holderId && r.validPhone ? { ...r, included: !r.included } : r))
    );
  };

  async function runSend(onlyFailed = false) {
    setRunning(true);
    setFinished(false);
    const targets = recipients
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.included && r.validPhone && (onlyFailed ? r.status === "failed" : r.status !== "ok"));

    for (const { r, idx } of targets) {
      setRecipients((prev) => prev.map((x, i) => (i === idx ? { ...x, status: "sending" } : x)));
      try {
        const message = renderTemplate(template, r.holder);
        const res = await api.sendMessage(r.holder.id, message, templateName);
        setRecipients((prev) =>
          prev.map((x, i) =>
            i === idx
              ? { ...x, status: res.ok ? "ok" : "failed", error: res.ok ? undefined : res.error, sentCount: res.ok ? x.sentCount + 1 : x.sentCount }
              : x
          )
        );
      } catch (e) {
        setRecipients((prev) =>
          prev.map((x, i) =>
            i === idx ? { ...x, status: "failed", error: e instanceof Error ? e.message : "שגיאה" } : x
          )
        );
      }
      await new Promise((res) => setTimeout(res, THROTTLE_MS));
    }
    setRunning(false);
    setFinished(true);
    onDone();
  }

  return (
    <Modal
      title="שליחה לרשימת תפוצה"
      subtitle={`${holders.length} נבחרו · ${included.length} ייכללו · השהיה ${THROTTLE_MS / 1000} שנ' בין הודעות`}
      icon="💬"
      onClose={running ? () => {} : onClose}
      wide
    >
      <div className="space-y-4">
        {!running && !finished && (
          <>
            {templates.length > 0 && (
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className="text-xs text-slate-400">תבניות:</span>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTemplate(t.body);
                      setTemplateName(t.name);
                    }}
                    className={clsx(
                      "text-xs px-2.5 py-1 rounded-full font-medium",
                      templateName === t.name
                        ? "bg-brand-600 text-white"
                        : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                תוכן ההודעה <span className="text-slate-400 font-normal">— משתנים: {"{שם}"} {"{מצב}"} {"{טלפון}"}</span>
              </label>
              <textarea
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value);
                  setTemplateName(null);
                }}
                rows={4}
                className="focus-ring w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none"
              />
            </div>

            {previewHolder && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">תצוגה מקדימה · {previewHolder.name}</p>
                <div className="flex justify-start">
                  <div className="chat-bubble chat-bubble-out">{preview}</div>
                </div>
              </div>
            )}

            {/* אזהרת כפילויות */}
            {duplicates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                <span className="text-xl">⚠️</span>
                <p className="text-sm text-amber-800 flex-1">
                  <b>{duplicates.length} נמענים כבר קיבלו את התוכן הזה בדיוק.</b> שליחה חוזרת עלולה
                  ליצור חוסר נעימות.
                </p>
                <Button variant="secondary" size="sm" onClick={excludeDuplicates}>
                  הסר אותם ({duplicates.length})
                </Button>
              </div>
            )}

            {/* רשימת נמענים עם היסטוריה */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-2 text-sm">נמענים</h3>
              <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                {recipients.map((r) => (
                  <label
                    key={r.holder.id}
                    className={clsx(
                      "flex items-center gap-2.5 px-3 py-2 text-sm",
                      r.validPhone ? "cursor-pointer hover:bg-slate-50" : "opacity-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={r.included}
                      disabled={!r.validPhone}
                      onChange={() => toggle(r.holder.id)}
                      className="w-4 h-4 accent-brand-600"
                    />
                    <Avatar name={r.holder.name} size={28} />
                    <span className="flex-1 truncate font-medium text-slate-700">
                      {r.holder.name || r.holder.phone}
                    </span>
                    {!r.validPhone && <span className="text-xs text-red-500">אין טלפון תקין</span>}
                    {r.validPhone && r.holder.waCheck === "invalid" && (
                      <span className="text-xs text-red-500">✖ אין WhatsApp</span>
                    )}
                    {r.duplicate && (
                      <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">
                        קיבל תוכן זהה
                      </span>
                    )}
                    {r.sentCount > 0 ? (
                      <span
                        className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 tabular-nums"
                        title="סה״כ הודעות שנשלחו אליו בעבר"
                      >
                        💬 {r.sentCount} בעבר
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">טרם נשלחה הודעה</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {(running || finished) && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-semibold text-slate-700">{done} / {included.length}</span>
                <span className="flex gap-3">
                  <span className="text-green-600">✓ {sentOk}</span>
                  {failed > 0 && <span className="text-red-600">⚠️ {failed}</span>}
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-green-400 to-green-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {recipients
                .filter((r) => r.included || r.status !== "pending")
                .map((r) => (
                  <div key={r.holder.id} className="flex items-center gap-2.5 text-sm px-1 py-1.5 rounded-lg hover:bg-slate-50">
                    <Avatar name={r.holder.name} size={30} />
                    <span className="flex-1 truncate text-slate-700">{r.holder.name || r.holder.phone}</span>
                    <StatusTag status={r.status} error={r.error} />
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          {!running && !finished && (
            <>
              <Button variant="ghost" onClick={onClose}>ביטול</Button>
              <Button variant="whatsapp" icon="💬" disabled={included.length === 0} onClick={() => runSend(false)}>
                שלח ל-{included.length} נמענים
              </Button>
            </>
          )}
          {finished && (
            <>
              {failed > 0 && <Button variant="primary" onClick={() => runSend(true)}>נסה שוב לכשלים ({failed})</Button>}
              <Button variant="secondary" onClick={onClose}>סגור</Button>
            </>
          )}
          {running && (
            <span className="px-4 py-2 text-slate-500 text-sm flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /> שולח…
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}

function StatusTag({ status, error }: { status: SendStatus; error?: string }) {
  const map = {
    ok: <span className="text-green-600 font-medium">✓ נשלח</span>,
    failed: <span className="text-red-600 font-medium" title={error}>⚠️ נכשל</span>,
    sending: (
      <span className="text-brand-500 font-medium flex items-center gap-1">
        <span className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        שולח
      </span>
    ),
    pending: <span className="text-slate-300">בתור</span>,
    skipped: <span className="text-slate-300">דולג</span>,
  };
  return map[status];
}
