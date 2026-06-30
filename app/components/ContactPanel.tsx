"use client";

import { useEffect, useRef, useState } from "react";
import type { HolderDTO, MessageDTO } from "@/app/lib/types";
import { STATUS_LABELS } from "@/app/lib/types";
import { api } from "@/app/lib/api-client";
import { DEFAULT_TEMPLATES, renderTemplate } from "@/app/lib/template";

interface Props {
  holder: HolderDTO;
  onClose: () => void;
  onHolderUpdated: (h: HolderDTO) => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ContactPanel({ holder, onClose, onHolderUpdated }: Props) {
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"chat" | "details">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    setLoading(true);
    try {
      const { messages } = await api.getMessages(holder.id);
      setMessages(messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "טעינת הודעות נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holder.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError("");
    try {
      const res = await api.sendMessage(holder.id, text);
      setMessages((m) => [...m, res.message]);
      setDraft("");
      if (res.ok) {
        onHolderUpdated({ ...holder, lastMessageAt: res.message.timestamp });
      } else {
        setError(res.error || "ההודעה נכשלה");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "שליחה נכשלה");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status: string) {
    try {
      const { holder: updated } = await api.updateHolder(holder.id, { status: status as HolderDTO["status"] });
      onHolderUpdated(updated);
    } catch {
      /* מטופל בשקט */
    }
  }

  return (
    <div className="fixed inset-y-0 left-0 z-40 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slide-in">
      {/* כותרת */}
      <div className="bg-orange-600 text-white p-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">{holder.name || "ללא שם"}</h2>
          <p className="text-orange-100 text-sm">{holder.phone || "אין טלפון"}</p>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">
          ×
        </button>
      </div>

      {/* טאבים */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab("chat")}
          className={`flex-1 py-2.5 text-sm font-medium ${
            tab === "chat" ? "text-orange-600 border-b-2 border-orange-600" : "text-slate-500"
          }`}
        >
          💬 שיחה
        </button>
        <button
          onClick={() => setTab("details")}
          className={`flex-1 py-2.5 text-sm font-medium ${
            tab === "details" ? "text-orange-600 border-b-2 border-orange-600" : "text-slate-500"
          }`}
        >
          📋 פרטים
        </button>
      </div>

      {tab === "details" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
          <DetailRow label="שווי יחסי" value={holder.relativeValue} />
          <DetailRow label="מצב" value={holder.state} />
          <DetailRow label="תשלומי איזון — משלם" value={holder.balancePay} />
          <DetailRow label="תשלומי איזון — מקבל" value={holder.balanceReceive} />
          <DetailRow label="הערות" value={holder.notes} />
          <div>
            <label className="block text-slate-500 mb-1">סטטוס</label>
            <select
              value={holder.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {Object.entries(holder.extra || {}).map(([k, v]) => (
            <DetailRow key={k} label={k} value={v} />
          ))}
        </div>
      ) : (
        <>
          {/* היסטוריית שיחה */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
            {loading ? (
              <p className="text-center text-slate-400 mt-8">טוען היסטוריה…</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-slate-400 mt-8">
                אין הודעות עדיין. שלחו הודעה ראשונה למטה.
              </p>
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}
          </div>

          {/* תיבת כתיבה + תבניות */}
          <div className="border-t border-slate-200 p-3 bg-white">
            {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
            <div className="flex gap-1 mb-2 flex-wrap">
              {DEFAULT_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setDraft(renderTemplate(t.text, holder))}
                  className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full hover:bg-orange-100"
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
                }}
                rows={2}
                placeholder="הקלידו הודעה… (Ctrl+Enter לשליחה)"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 resize-none text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium text-sm whitespace-nowrap"
              >
                {sending ? "שולח…" : "שלח"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: MessageDTO }) {
  const isOut = message.direction === "out";
  const failed = message.status === "failed";
  return (
    <div className={`flex ${isOut ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          isOut
            ? failed
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-900"
            : "bg-white border border-slate-200 text-slate-800"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 justify-end">
          <span>{formatTime(message.timestamp)}</span>
          {isOut && (
            <span>
              {failed ? "⚠️ נכשל" : message.status === "read" ? "✓✓" : message.status === "delivered" ? "✓✓" : "✓"}
            </span>
          )}
        </div>
        {failed && message.errorText && (
          <p className="text-[10px] text-red-600 mt-1">{message.errorText}</p>
        )}
      </div>
    </div>
  );
}
