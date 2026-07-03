"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import type { HolderDTO, MessageDTO } from "@/app/lib/types";
import { STATUS_LABELS, GROUP_STATUS_LABELS } from "@/app/lib/types";
import { api } from "@/app/lib/api-client";
import { renderTemplate } from "@/app/lib/template";
import { useTemplates } from "@/app/lib/useTemplates";
import { formatPhone, formatDaySeparator, formatTimeOnly, formatNumber } from "@/app/lib/format";
import { Avatar, StatusBadge, Spinner } from "./ui/atoms";
import Button from "./ui/Button";
import { useToast } from "./ui/Toast";

interface Props {
  holder: HolderDTO;
  onClose: () => void;
  onHolderUpdated: (h: HolderDTO) => void;
}

export default function ContactPanel({ holder, onClose, onHolderUpdated }: Props) {
  const { toast } = useToast();
  const { templates } = useTemplates();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"chat" | "details">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    setLoading(true);
    try {
      const { messages } = await api.getMessages(holder.id);
      setMessages(messages);
    } catch {
      toast("טעינת ההיסטוריה נכשלה", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holder.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await api.sendMessage(holder.id, text);
      setMessages((m) => [...m, res.message]);
      setDraft("");
      if (res.ok) {
        onHolderUpdated({ ...holder, lastMessageAt: res.message.timestamp });
      } else {
        toast(res.error || "ההודעה נכשלה", "error");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "שליחה נכשלה", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status: string) {
    try {
      const { holder: updated } = await api.updateHolder(holder.id, {
        status: status as HolderDTO["status"],
      });
      onHolderUpdated(updated);
      toast("הסטטוס עודכן", "success");
    } catch {
      toast("עדכון הסטטוס נכשל", "error");
    }
  }

  // קיבוץ הודעות לפי יום
  const grouped: { day: string; items: MessageDTO[] }[] = [];
  for (const m of messages) {
    const day = formatDaySeparator(m.timestamp);
    const last = grouped[grouped.length - 1];
    if (last && last.day === day) last.items.push(m);
    else grouped.push({ day, items: [m] });
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 z-40 w-full max-w-md bg-white shadow-pop flex flex-col animate-slide-in">
        {/* כותרת */}
        <div className="bg-gradient-to-l from-brand-600 to-brand-500 text-white px-4 py-3.5 flex items-center gap-3">
          <button onClick={onClose} className="text-white/90 hover:text-white text-xl w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center shrink-0">
            ✕
          </button>
          <Avatar name={holder.name} size={44} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold truncate">{holder.name || "ללא שם"}</h2>
            <p className="text-brand-50/90 text-xs flex items-center gap-1.5">
              <span>{holder.phone ? formatPhone(holder.phone) : "אין טלפון"}</span>
              {holder.waCheck === "valid" && <span title="למספר יש WhatsApp">✔</span>}
              {holder.waCheck === "invalid" && <span title="למספר אין WhatsApp">⚠ אין WhatsApp</span>}
            </p>
          </div>
          <StatusBadge status={holder.status} />
        </div>

        {/* פס סיכום תקשורת — כמה קיבל, כמה ענה, חברות בקבוצה */}
        <div className="bg-brand-800/95 text-white px-4 py-2 flex items-center gap-2 text-xs overflow-x-auto">
          <span className="bg-white/10 rounded-full px-2.5 py-1 whitespace-nowrap">
            💬 נשלחו אליו <b className="tabular-nums">{holder.msgStats?.out ?? 0}</b>
          </span>
          <span className="bg-white/10 rounded-full px-2.5 py-1 whitespace-nowrap">
            ↩ השיב <b className="tabular-nums">{holder.msgStats?.in ?? 0}</b>
          </span>
          {(holder.msgStats?.failed ?? 0) > 0 && (
            <span className="bg-red-500/30 rounded-full px-2.5 py-1 whitespace-nowrap">
              ⚠ נכשלו <b className="tabular-nums">{holder.msgStats.failed}</b>
            </span>
          )}
          <span
            className={clsx(
              "rounded-full px-2.5 py-1 whitespace-nowrap",
              holder.groupStatus === "added"
                ? "bg-green-500/30"
                : holder.groupStatus === "invited"
                  ? "bg-amber-500/30"
                  : "bg-white/10"
            )}
          >
            👥 {GROUP_STATUS_LABELS[holder.groupStatus] ?? "לא בקבוצה"}
          </span>
        </div>

        {/* טאבים */}
        <div className="flex border-b border-slate-200 bg-white shrink-0">
          {(["chat", "details"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 py-2.5 text-sm font-semibold transition-colors relative",
                tab === t ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t === "chat" ? "💬 שיחה" : "📋 פרטים"}
              {tab === t && <span className="absolute bottom-0 inset-x-6 h-0.5 bg-brand-500 rounded-full" />}
            </button>
          ))}
        </div>

        {tab === "details" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            <DetailRow label="שווי יחסי" value={formatNumber(holder.relativeValue)} />
            <DetailRow label="מצב" value={holder.state} />
            <DetailRow label="תשלומי איזון — משלם" value={formatNumber(holder.balancePay)} />
            <DetailRow label="תשלומי איזון — מקבל" value={formatNumber(holder.balanceReceive)} />
            <DetailRow label="הערות" value={holder.notes} />
            {Object.entries(holder.extra || {}).map(([k, v]) => (
              <DetailRow key={k} label={k} value={v} />
            ))}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">סטטוס</label>
              <div className="flex gap-2">
                {(["signed", "pending", "objected"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={clsx(
                      "flex-1 py-2 rounded-xl text-sm font-semibold border transition-all",
                      holder.status === s
                        ? s === "signed"
                          ? "bg-green-600 text-white border-green-600"
                          : s === "objected"
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-slate-700 text-white border-slate-700"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* שיחה */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 chat-wallpaper flex flex-col gap-2">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Spinner />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="font-medium text-slate-500">אין הודעות עדיין</p>
                  <p className="text-sm">שלחו הודעה ראשונה למטה, או בחרו תבנית.</p>
                </div>
              ) : (
                grouped.map((g, gi) => (
                  <div key={gi} className="flex flex-col gap-1.5">
                    <div className="flex justify-center my-1">
                      <span className="chat-date-sep">{g.day}</span>
                    </div>
                    {g.items.map((m) => (
                      <MessageBubble key={m.id} message={m} />
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* מחבר */}
            <div className="border-t border-slate-200 p-3 bg-white shrink-0">
              {templates.length > 0 && (
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setDraft(renderTemplate(t.body, holder))}
                      className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100 font-medium transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
                  }}
                  rows={2}
                  placeholder="הקלידו הודעה…  (Ctrl+Enter לשליחה)"
                  className="focus-ring flex-1 border border-slate-200 rounded-xl px-3 py-2 resize-none text-sm outline-none bg-slate-50"
                />
                <Button variant="whatsapp" loading={sending} disabled={!draft.trim()} onClick={handleSend} className="shrink-0">
                  שלח
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-3 bg-slate-50 rounded-xl px-3.5 py-2.5">
      <span className="text-slate-400 text-sm shrink-0">{label}</span>
      <span className="font-semibold text-slate-700 text-sm text-left truncate">{value || "—"}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: MessageDTO }) {
  const isOut = message.direction === "out";
  const failed = message.status === "failed";
  const tick = failed ? "⚠️" : message.status === "read" ? "✓✓" : message.status === "delivered" ? "✓✓" : "✓";
  return (
    <div className={clsx("flex", isOut ? "justify-start" : "justify-end")}>
      <div className={clsx("chat-bubble", failed ? "chat-bubble-failed" : isOut ? "chat-bubble-out" : "chat-bubble-in")}>
        {message.type === "invite" && (
          <span className="inline-block text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 mb-1 font-semibold">
            👥 הזמנה לקבוצה
          </span>
        )}
        <p className="whitespace-pre-wrap">{message.body}</p>
        <div className={clsx("flex items-center gap-1 mt-0.5 text-[10px] justify-end", failed ? "text-red-500" : "text-slate-400")}>
          <span>{formatTimeOnly(message.timestamp)}</span>
          {isOut && <span className={message.status === "read" ? "text-sky-500" : ""}>{tick}</span>}
        </div>
        {failed && message.errorText && <p className="text-[10px] text-red-500 mt-1 border-t border-red-200 pt-1">{message.errorText}</p>}
      </div>
    </div>
  );
}
