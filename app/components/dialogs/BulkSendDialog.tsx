"use client";

import { useState } from "react";
import Modal from "./Modal";
import { api } from "@/app/lib/api-client";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/app/lib/template";
import { isValidIsraeliPhone } from "@/app/lib/phone";
import type { HolderDTO } from "@/app/lib/types";

interface Props {
  holders: HolderDTO[]; // הנבחרים
  onClose: () => void;
  onDone: () => void;
}

interface SendResult {
  holder: HolderDTO;
  status: "pending" | "sending" | "ok" | "failed" | "skipped";
  error?: string;
}

const THROTTLE_MS = 3000; // השהיה בין הודעות למניעת חסימת המספר

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
          prev.map((x, i) =>
            i === idx
              ? { ...x, status: res.ok ? "ok" : "failed", error: res.ok ? undefined : res.error }
              : x
          )
        );
      } catch (e) {
        setResults((prev) =>
          prev.map((x, i) =>
            i === idx ? { ...x, status: "failed", error: e instanceof Error ? e.message : "שגיאה" } : x
          )
        );
      }
      // throttle בין הודעות
      await new Promise((res) => setTimeout(res, THROTTLE_MS));
    }
    setRunning(false);
    setFinished(true);
    onDone();
  }

  return (
    <Modal title={`שליחה לנבחרים (${holders.length})`} onClose={running ? () => {} : onClose} wide>
      <div className="space-y-4">
        {!running && !finished && (
          <>
            <div className="flex gap-1 flex-wrap">
              {DEFAULT_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setTemplate(t.text)}
                  className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full hover:bg-orange-100"
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                תוכן ההודעה (משתנים: {"{שם}"}, {"{מצב}"}, {"{טלפון}"})
              </label>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={4}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            {previewHolder && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p className="text-xs text-slate-500 mb-1">תצוגה מקדימה ({previewHolder.name}):</p>
                <p className="whitespace-pre-wrap">{preview}</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p>
                יישלחו <b>{validTargets.length}</b> הודעות (השהיה {THROTTLE_MS / 1000} שניות בין כל הודעה).
              </p>
              {results.some((r) => r.status === "skipped") && (
                <p className="text-amber-600 mt-1">
                  {results.filter((r) => r.status === "skipped").length} נמענים ידולגו (ללא טלפון תקין).
                </p>
              )}
            </div>
          </>
        )}

        {(running || finished) && (
          <div className="space-y-2">
            <div className="bg-slate-50 rounded-lg p-3 text-sm flex gap-4">
              <span className="text-green-600">✓ נשלחו: {sentOk}</span>
              <span className="text-red-600">⚠️ נכשלו: {failed}</span>
              <span className="text-slate-500">סהכ: {validTargets.length}</span>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {results.map((r) => (
                <div
                  key={r.holder.id}
                  className="flex items-center justify-between text-sm border-b border-slate-100 py-1"
                >
                  <span>{r.holder.name || r.holder.phone}</span>
                  <span>
                    {r.status === "ok" && <span className="text-green-600">✓ נשלח</span>}
                    {r.status === "failed" && (
                      <span className="text-red-600" title={r.error}>
                        ⚠️ נכשל
                      </span>
                    )}
                    {r.status === "sending" && <span className="text-orange-500">שולח…</span>}
                    {r.status === "pending" && <span className="text-slate-400">בתור</span>}
                    {r.status === "skipped" && <span className="text-slate-400">דולג</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          {!running && !finished && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                ביטול
              </button>
              <button
                onClick={() => runSend(false)}
                disabled={validTargets.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
              >
                שלח לכולם
              </button>
            </>
          )}
          {finished && (
            <>
              {failed > 0 && (
                <button
                  onClick={() => runSend(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                >
                  נסה שוב לכשלים ({failed})
                </button>
              )}
              <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-lg">
                סגור
              </button>
            </>
          )}
          {running && <span className="px-4 py-2 text-slate-500">שולח… אנא המתינו</span>}
        </div>
      </div>
    </Modal>
  );
}
