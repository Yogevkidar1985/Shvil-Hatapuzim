"use client";

import { useState } from "react";
import { clsx } from "clsx";
import Modal from "./Modal";
import Button from "../ui/Button";
import { Avatar } from "../ui/atoms";
import { api } from "@/app/lib/api-client";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/app/lib/template";
import { isValidIsraeliPhone } from "@/app/lib/phone";
import type { HolderDTO } from "@/app/lib/types";

interface Props {
  holders: HolderDTO[];
  onClose: () => void;
  onDone: () => void;
}

interface SendResult {
  holder: HolderDTO;
  status: "pending" | "sending" | "ok" | "failed" | "skipped";
  error?: string;
}

const THROTTLE_MS = 3000;

export default function BulkSendDialog({ holders, onClose, onDone }: Props) {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATES[0].text);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<SendResult[]>(
    holders.map((h) => ({
      holder: h,
      status: isValidIsraeliPhone(h.phone) ? "pending" : "skipped",
      error: isValidIsraeliPhone(h.phone) ? undefined : "אין טלפון תקין",
    }))
  );

  const validTargets = results.filter((r) => r.status !== "skipped");
  const sentOk = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const done = sentOk + failed;
  const progress = validTargets.length ? Math.round((done / validTargets.length) * 100) : 0;

  const previewHolder = holders[0];
  const preview = previewHolder ? renderTemplate(template, previewHolder) : "";

  async function runSend(onlyFailed = false) {
    setRunning(true);
    setFinished(false);
    const toSend = results
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.status !== "skipped" && (onlyFailed ? r.status === "failed" : true));

    for (const { r, idx } of toSend) {
      setResults((prev) => prev.map((x, i) => (i === idx ? { ...x, status: "sending" } : x)));
      try {
        const message = renderTemplate(template, r.holder);
        const res = await api.sendMessage(r.holder.id, message);
        setResults((prev) =>
          prev.map((x, i) => (i === idx ? { ...x, status: res.ok ? "ok" : "failed", error: res.ok ? undefined : res.error } : x))
        );
      } catch (e) {
        setResults((prev) =>
          prev.map((x, i) => (i === idx ? { ...x, status: "failed", error: e instanceof Error ? e.message : "שגיאה" } : x))
        );
      }
      await new Promise((res) => setTimeout(res, THROTTLE_MS));
    }
    setRunning(false);
    setFinished(true);
    onDone();
  }

  return (
    <Modal title="שליחה לרשימת תפוצה" subtitle={`${holders.length} נמענים נבחרו · השהיה ${THROTTLE_MS / 1000} שנ' בין הודעות`} icon="💬" onClose={running ? () => {} : onClose} wide>
      <div className="space-y-4">
        {!running && !finished && (
          <>
            <div className="flex gap-1.5 flex-wrap">
              {DEFAULT_TEMPLATES.map((t) => (
                <button key={t.name} onClick={() => setTemplate(t.text)}
                  className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100 font-medium">
                  {t.name}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                תוכן ההודעה <span className="text-slate-400 font-normal">— משתנים: {"{שם}"} {"{מצב}"} {"{טלפון}"}</span>
              </label>
              <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={4}
                className="focus-ring w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none" />
            </div>
            {previewHolder && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">תצוגה מקדימה · {previewHolder.name}</p>
                <div className="flex justify-start">
                  <div className="chat-bubble chat-bubble-out">{preview}</div>
                </div>
              </div>
            )}
            <div className="bg-slate-50 rounded-xl p-3 text-sm flex items-center justify-between">
              <span className="text-slate-600">יישלחו <b className="text-slate-800">{validTargets.length}</b> הודעות</span>
              {results.some((r) => r.status === "skipped") && (
                <span className="text-amber-600 text-xs">
                  {results.filter((r) => r.status === "skipped").length} ידולגו (ללא טלפון תקין)
                </span>
              )}
            </div>
          </>
        )}

        {(running || finished) && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-semibold text-slate-700">{done} / {validTargets.length}</span>
                <span className="flex gap-3">
                  <span className="text-green-600">✓ {sentOk}</span>
                  {failed > 0 && <span className="text-red-600">⚠️ {failed}</span>}
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-green-400 to-green-600 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {results.map((r) => (
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
              <Button variant="whatsapp" icon="💬" disabled={validTargets.length === 0} onClick={() => runSend(false)}>
                שלח לכולם ({validTargets.length})
              </Button>
            </>
          )}
          {finished && (
            <>
              {failed > 0 && <Button variant="primary" onClick={() => runSend(true)}>נסה שוב לכשלים ({failed})</Button>}
              <Button variant="secondary" onClick={onClose}>סגור</Button>
            </>
          )}
          {running && <span className="px-4 py-2 text-slate-500 text-sm flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /> שולח…
          </span>}
        </div>
      </div>
    </Modal>
  );
}

function StatusTag({ status, error }: { status: SendResult["status"]; error?: string }) {
  const map = {
    ok: <span className="text-green-600 font-medium">✓ נשלח</span>,
    failed: <span className="text-red-600 font-medium" title={error}>⚠️ נכשל</span>,
    sending: <span className="text-brand-500 font-medium flex items-center gap-1"><span className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />שולח</span>,
    pending: <span className="text-slate-300">בתור</span>,
    skipped: <span className="text-slate-300">דולג</span>,
  };
  return map[status];
}
