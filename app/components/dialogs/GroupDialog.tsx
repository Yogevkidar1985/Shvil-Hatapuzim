"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import Modal from "./Modal";
import Button from "../ui/Button";
import { Avatar } from "../ui/atoms";
import { useToast } from "../ui/Toast";
import { api, type MemberOpResult } from "@/app/lib/api-client";
import { isValidIsraeliPhone, waMeLink } from "@/app/lib/phone";
import type { HolderDTO, GroupDTO } from "@/app/lib/types";

interface Props {
  holders: HolderDTO[]; // הנבחרים
  /** האם GreenAPI מחובר — קובע אם מצב ברירת המחדל אוטומטי או ידני */
  apiReady?: boolean;
  onClose: () => void;
  onDone: () => void;
}

type RowStatus = "pending" | "working" | MemberOpResult;

interface Row {
  holder: HolderDTO;
  validPhone: boolean;
  status: RowStatus;
  error?: string;
}

const THROTTLE_MS = 2500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function GroupDialog({ holders, apiReady = false, onClose, onDone }: Props) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [mode, setMode] = useState<"manual" | "new" | "existing">(apiReady ? "new" : "manual");
  const [groupName, setGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  // מצב ידני: אשף שליחת הזמנות אחד-אחד דרך wa.me
  const [manualLink, setManualLink] = useState("");
  const [manualGroupId, setManualGroupId] = useState("");
  const [manualPos, setManualPos] = useState(-1);
  const [manualBusy, setManualBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    holders.map((h) => ({
      holder: h,
      validPhone: isValidIsraeliPhone(h.phone),
      status: isValidIsraeliPhone(h.phone) ? "pending" : "skipped",
      error: isValidIsraeliPhone(h.phone) ? undefined : "אין טלפון תקין",
    }))
  );

  useEffect(() => {
    api
      .listGroups()
      .then(({ groups }) => {
        setGroups(groups);
        if (groups.length > 0) {
          if (apiReady) setMode("existing");
          setSelectedGroupId(groups[0].id);
          setInviteLink(groups[0].inviteLink);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingGroups(false));
  }, []);

  const validRows = useMemo(() => rows.filter((r) => r.validPhone), [rows]);
  const doneCounts = useMemo(
    () => ({
      added: rows.filter((r) => r.status === "added").length,
      invited: rows.filter((r) => r.status === "invited").length,
      failed: rows.filter((r) => r.status === "failed" || r.status === "invite_needed").length,
    }),
    [rows]
  );

  const setRow = (holderId: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.holder.id === holderId ? { ...r, ...patch } : r)));

  async function run() {
    if (mode === "new" && !groupName.trim()) {
      toast("חובה להזין שם קבוצה", "error");
      return;
    }
    if (mode === "existing" && !selectedGroupId) {
      toast("בחרו קבוצה קיימת", "error");
      return;
    }
    setRunning(true);

    try {
      if (mode === "new") {
        // יצירת הקבוצה עם כולם בקריאה אחת
        validRows.forEach((r) => setRow(r.holder.id, { status: "working" }));
        const { group, results } = await api.createGroup(groupName.trim(), validRows.map((r) => r.holder.id));
        setInviteLink(group.inviteLink);
        setGroups((g) => [group, ...g]);

        for (const res of results) {
          setRow(res.holderId, { status: res.result, error: res.error });
        }
        // שליחת הזמנות למי שצירוף ישיר נחסם — אחד-אחד עם השהיה
        const needInvite = results.filter((r) => r.result === "invite_needed");
        for (const r of needInvite) {
          setRow(r.holderId, { status: "working" });
          try {
            const inv = await api.sendGroupInvite(group.id, r.holderId);
            setRow(r.holderId, { status: inv.result, error: inv.error });
          } catch (e) {
            setRow(r.holderId, { status: "failed", error: e instanceof Error ? e.message : "שגיאה" });
          }
          await sleep(THROTTLE_MS);
        }
      } else {
        const group = groups.find((g) => g.id === selectedGroupId);
        if (group) setInviteLink(group.inviteLink);
        // צירוף אחד-אחד עם השהיה, ונפילה אוטומטית לקישור הזמנה
        for (const r of validRows) {
          setRow(r.holder.id, { status: "working" });
          try {
            const res = await api.addToGroup(selectedGroupId, r.holder.id);
            if (res.result === "invite_needed") {
              const inv = await api.sendGroupInvite(selectedGroupId, r.holder.id);
              setRow(r.holder.id, { status: inv.result, error: inv.error });
            } else {
              setRow(r.holder.id, { status: res.result, error: res.error });
            }
          } catch (e) {
            setRow(r.holder.id, { status: "failed", error: e instanceof Error ? e.message : "שגיאה" });
          }
          await sleep(THROTTLE_MS);
        }
      }
      setFinished(true);
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : "הפעולה נכשלה", "error");
    } finally {
      setRunning(false);
    }
  }

  // ===== מצב ידני: יצירת קבוצה + שליחת הזמנות אחד-אחד דרך wa.me =====
  const inviteMsg = (h: HolderDTO) =>
    `שלום ${h.name || ""}, מוזמנים להצטרף לקבוצת הוואטסאפ של בעלי הזכויות בפרויקט גוש 6446:\n${manualLink}`;

  const nextManual = (from: number) =>
    rows.findIndex((r, i) => i > from && r.validPhone && !["invited", "added"].includes(r.status));

  async function startManual() {
    if (!groupName.trim()) return toast("חובה להזין שם קבוצה", "error");
    if (!/chat\.whatsapp\.com\//i.test(manualLink)) {
      return toast("הדביקו קישור הזמנה תקין (chat.whatsapp.com/...)", "error");
    }
    setRunning(true);
    try {
      const { group } = await api.createManualGroup(groupName.trim(), manualLink.trim());
      setManualGroupId(group.gaGroupId);
      setGroups((g) => [group, ...g]);
      const first = nextManual(-1);
      if (first === -1) {
        setFinished(true);
        onDone();
      } else {
        setManualPos(first);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "יצירת הקבוצה נכשלה", "error");
      setRunning(false);
    }
  }

  function advanceManual(from: number) {
    const nxt = nextManual(from);
    if (nxt === -1) {
      setManualPos(-1);
      setRunning(false);
      setFinished(true);
      onDone();
    } else {
      setManualPos(nxt);
    }
  }

  async function manualInviteCurrent() {
    const idx = manualPos;
    const r = rows[idx];
    if (!r) return;
    const link = waMeLink(r.holder.phone, inviteMsg(r.holder));
    if (link) window.open(link, "_blank", "noopener");
    setManualBusy(true);
    try {
      await api.markManualInvite(manualGroupId, r.holder.id);
      setRow(r.holder.id, { status: "invited" });
    } catch (e) {
      setRow(r.holder.id, { status: "failed", error: e instanceof Error ? e.message : "שגיאה" });
    } finally {
      setManualBusy(false);
    }
    advanceManual(idx);
  }

  async function handleSync() {
    try {
      const r = await api.syncGroups();
      toast(`סנכרון הושלם: ${r.joined} הצטרפו, ${r.left} עזבו`, "success");
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : "סנכרון נכשל", "error");
    }
  }

  function copyInvite() {
    if (!inviteLink) return;
    navigator.clipboard?.writeText(inviteLink).then(
      () => toast("קישור ההזמנה הועתק", "success"),
      () => toast("העתקה נכשלה", "error")
    );
  }

  return (
    <Modal
      title="קבוצת WhatsApp"
      subtitle={`${holders.length} נבחרו · צירוף ישיר, ומי שחסום — מקבל קישור הזמנה אוטומטית`}
      icon="👥"
      onClose={running ? () => {} : onClose}
      wide
    >
      <div className="space-y-4">
        {!finished && manualPos < 0 && (
          <>
            {/* בחירת יעד: ידני / חדשה / קיימת */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => !running && setMode("manual")}
                className={clsx(
                  "rounded-xl border p-3 text-right transition-all",
                  mode === "manual"
                    ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="font-bold text-slate-700 text-sm">📱 ידני (חינם)</div>
                <div className="text-xs text-slate-400 mt-0.5">שליחת הזמנה מהווטסאפ שלך</div>
              </button>
              <button
                onClick={() => !running && setMode("new")}
                disabled={!apiReady}
                title={apiReady ? "" : "דורש חיבור GreenAPI בהגדרות"}
                className={clsx(
                  "rounded-xl border p-3 text-right transition-all disabled:opacity-40",
                  mode === "new"
                    ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="font-bold text-slate-700 text-sm">🤖 חדשה (אוטומטי)</div>
                <div className="text-xs text-slate-400 mt-0.5">{apiReady ? "GreenAPI יוצר ומצרף" : "דורש GreenAPI"}</div>
              </button>
              <button
                onClick={() => !running && groups.length > 0 && apiReady && setMode("existing")}
                disabled={groups.length === 0 || !apiReady}
                className={clsx(
                  "rounded-xl border p-3 text-right transition-all disabled:opacity-40",
                  mode === "existing"
                    ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="font-bold text-slate-700 text-sm">👥 קיימת (אוטומטי)</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {loadingGroups ? "טוען…" : groups.length === 0 ? "אין קבוצות" : `${groups.length} קבוצות`}
                </div>
              </button>
            </div>

            {mode === "manual" ? (
              <div className="space-y-3">
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                  <b className="text-slate-800">איך זה עובד:</b> 1) צרו קבוצת WhatsApp רגילה בטלפון ·
                  2) בהגדרות הקבוצה → &quot;הזמנה באמצעות קישור&quot; → העתיקו את הקישור ·
                  3) הדביקו כאן. המערכת תשלח לכל אחד את ההזמנה מהווטסאפ שלכם ותתעד מי הוזמן.
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">שם הקבוצה</label>
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    disabled={running}
                    placeholder='למשל: "עדכוני גוש 6446 — בעלי זכויות"'
                    className="focus-ring w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">קישור הזמנה לקבוצה</label>
                  <input
                    value={manualLink}
                    onChange={(e) => setManualLink(e.target.value)}
                    disabled={running}
                    dir="ltr"
                    placeholder="https://chat.whatsapp.com/XXXXXXXX"
                    className="focus-ring w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none text-sm"
                  />
                </div>
              </div>
            ) : mode === "new" ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">שם הקבוצה</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={running}
                  placeholder='למשל: "עדכוני גוש 6446 — בעלי זכויות"'
                  className="focus-ring w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">בחרו קבוצה</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setInviteLink(groups.find((g) => g.id === e.target.value)?.inviteLink ?? "");
                  }}
                  disabled={running}
                  className="focus-ring w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none bg-white"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} · {g.memberCount} חברים
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {/* אשף ההזמנה הידנית — נמען אחר נמען */}
        {manualPos >= 0 && rows[manualPos] && (
          <div className="card p-4 space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <Avatar name={rows[manualPos].holder.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 truncate">{rows[manualPos].holder.name}</div>
                <div className="text-sm text-slate-500 tabular-nums" dir="ltr">{rows[manualPos].holder.phone}</div>
              </div>
              <span className="text-xs text-slate-400">
                הוזמנו {doneCounts.invited} / {validRows.length}
              </span>
            </div>
            <p className="text-xs text-slate-400 text-center">
              הלחיצה תפתח את ווטסאפ עם ההזמנה מוכנה — שלח, חזור לכאן והמשך
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setManualPos(-1); setRunning(false); }}>עצור</Button>
              <Button variant="secondary" onClick={() => advanceManual(manualPos)}>דלג ←</Button>
              <Button variant="whatsapp" icon="📱" loading={manualBusy} onClick={manualInviteCurrent}>
                שלח הזמנה בווטסאפ
              </Button>
            </div>
          </div>
        )}

        {/* רשימת אנשים + סטטוס חי */}
        <div>
          <h3 className="font-semibold text-slate-700 mb-2 text-sm flex items-center justify-between">
            <span>אנשים ({validRows.length} עם טלפון תקין)</span>
            {(running || finished) && (
              <span className="flex gap-3 text-xs font-medium">
                <span className="text-green-600">✓ צורפו {doneCounts.added}</span>
                <span className="text-amber-600">✉ הוזמנו {doneCounts.invited}</span>
                {doneCounts.failed > 0 && <span className="text-red-600">⚠ {doneCounts.failed}</span>}
              </span>
            )}
          </h3>
          <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
            {rows.map((r) => (
              <div key={r.holder.id} className={clsx("flex items-center gap-2.5 px-3 py-2 text-sm", !r.validPhone && "opacity-50")}>
                <Avatar name={r.holder.name} size={28} />
                <span className="flex-1 truncate font-medium text-slate-700">{r.holder.name || r.holder.phone}</span>
                {r.holder.groupStatus === "added" && r.status === "pending" && (
                  <span className="text-xs text-green-600" title="לפי הסנכרון האחרון">כבר בקבוצה ✓</span>
                )}
                <RowStatusTag status={r.status} error={r.error} />
              </div>
            ))}
          </div>
        </div>

        {/* קישור הזמנה */}
        {inviteLink && (
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5">
            <span className="text-xs text-slate-400 shrink-0">קישור הזמנה:</span>
            <span className="flex-1 text-xs text-slate-600 truncate" dir="ltr">{inviteLink}</span>
            <Button variant="secondary" size="sm" onClick={copyInvite}>העתק</Button>
          </div>
        )}

        <div className="flex gap-2 justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={handleSync} disabled={running} title="בדיקה ידנית עכשיו — המערכת גם מסנכרנת אוטומטית ברקע כל דקה">
            🔄 סנכרן עכשיו
          </Button>
          <div className="flex gap-2">
            {!finished && manualPos < 0 ? (
              <>
                <Button variant="ghost" onClick={onClose} disabled={running}>ביטול</Button>
                {mode === "manual" ? (
                  <Button variant="whatsapp" icon="📱" loading={running} disabled={validRows.length === 0} onClick={startManual}>
                    שלח הזמנות ל-{validRows.length}
                  </Button>
                ) : (
                  <Button variant="whatsapp" icon="👥" loading={running} disabled={validRows.length === 0} onClick={run}>
                    {mode === "new" ? `צור קבוצה וצרף ${validRows.length}` : `צרף ${validRows.length} לקבוצה`}
                  </Button>
                )}
              </>
            ) : finished ? (
              <Button variant="secondary" onClick={onClose}>סגור</Button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function RowStatusTag({ status, error }: { status: RowStatus; error?: string }) {
  switch (status) {
    case "added":
      return <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold">✓ צורף</span>;
    case "invited":
      return <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold" title="נשלח לו קישור הזמנה בפרטי">✉ הוזמן</span>;
    case "invite_needed":
      return <span className="text-xs bg-amber-50 text-amber-600 rounded-full px-2 py-0.5">ממתין להזמנה</span>;
    case "failed":
      return <span className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5 font-semibold" title={error}>⚠ נכשל</span>;
    case "skipped":
      return <span className="text-xs text-slate-300">דולג</span>;
    case "working":
      return (
        <span className="text-xs text-brand-500 flex items-center gap-1">
          <span className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          מצרף…
        </span>
      );
    default:
      return <span className="text-xs text-slate-300">בתור</span>;
  }
}
