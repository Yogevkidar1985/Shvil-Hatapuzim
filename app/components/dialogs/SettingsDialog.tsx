"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import Modal from "./Modal";
import Button from "../ui/Button";
import { Spinner } from "../ui/atoms";
import { useToast } from "../ui/Toast";
import { api } from "@/app/lib/api-client";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function SettingsDialog({ onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloud, setCloud] = useState<{ connected: boolean; provider: string } | null>(null);
  const [idInstance, setIdInstance] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [state, setState] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setCloud(s.cloud);
        setIdInstance(s.greenApi.idInstance);
        setApiToken(s.greenApi.apiTokenMasked);
        setApiUrl(s.greenApi.apiUrl);
        setHasToken(s.greenApi.hasToken);
      })
      .catch(() => toast("טעינת ההגדרות נכשלה", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function save(test: boolean) {
    setSaving(true);
    setState(null);
    try {
      const res = await api.saveSettings({ idInstance, apiToken, apiUrl, test });
      onSaved();
      if (test) {
        setState(res.state ?? "unknown");
        if (res.state === "authorized") toast("מחובר ומאומת ✓", "success");
        else if (res.error) toast(res.error, "error");
        else toast(`מצב החיבור: ${res.state}`, "info");
      } else {
        toast("ההגדרות נשמרו בענן", "success");
      }
      setHasToken(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "שמירה נכשלה", "error");
    } finally {
      setSaving(false);
    }
  }

  const waConnected = state === "authorized" || (hasToken && state === null);

  return (
    <Modal title="הגדרות ומצב חיבורים" subtitle="מפתחות ותצורה — נשמרים בענן, זמינים מכל מחשב" icon="⚙️" onClose={onClose} wide>
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="space-y-5">
          {/* ===== לוח בקרת חיבורים ===== */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-2">מצב המערכת</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <StatusTile
                icon="☁️"
                title="ענן (Supabase)"
                ok={!!cloud?.connected}
                okText="מחובר · נתונים נשמרים"
                badText="לא מחובר"
              />
              <StatusTile
                icon="🤖"
                title="WhatsApp אוטומטי"
                ok={waConnected}
                okText="GreenAPI מחובר"
                badText="לא מוגדר — ראו למטה"
              />
              <StatusTile
                icon="📱"
                title="שליחה ידנית"
                ok={true}
                okText="זמין תמיד · חינם"
                badText=""
              />
            </div>
          </div>

          {/* מצב ענן — הרחבה */}
          <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-2xl p-4">
            <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-soft shrink-0">☁️</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">שמירה בענן פעילה</span>
                <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> מחובר
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                כל הנתונים, ההודעות, התבניות והקבוצות נשמרים אוטומטית ב-<b>{cloud?.provider}</b> —
                לא מקומית. כל שינוי זמין מיד מכל מחשב.
              </p>
            </div>
          </div>

          {/* דרכי שליחה — הסבר */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">🚀 שתי דרכים לשלוח הודעות</h3>
            <div className="flex items-start gap-2.5 text-sm">
              <span className="text-lg shrink-0">📱</span>
              <p className="text-slate-600">
                <b className="text-slate-800">ידני (חינם, פעיל עכשיו):</b> ההודעה נפתחת מוכנה בווטסאפ שלך —
                אתה לוחץ &quot;שלח&quot;. עובד גם לקבוצה. כל שליחה מתועדת במערכת.
              </p>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <span className="text-lg shrink-0">🤖</span>
              <p className="text-slate-600">
                <b className="text-slate-800">אוטומטי (GreenAPI):</b> המערכת שולחת לבד לרשימה שלמה,
                מקבלת תשובות, ויוצרת קבוצה אוטומטית. דורש חיבור למטה.
              </p>
            </div>
          </div>

          {/* WhatsApp / GreenAPI */}
          <div className="border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💬</span>
              <h3 className="font-bold text-slate-800">חיבור WhatsApp (GreenAPI)</h3>
              {state && (
                <span className={clsx(
                  "text-xs rounded-full px-2 py-0.5 font-semibold mr-auto",
                  state === "authorized" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                )}>
                  {state === "authorized" ? "✓ מחובר ומאומת" : state === "error" ? "שגיאה" : state}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">idInstance</label>
                <input value={idInstance} onChange={(e) => setIdInstance(e.target.value)} dir="ltr"
                  placeholder="1101XXXXXX"
                  className="focus-ring w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  apiTokenInstance {hasToken && <span className="text-green-600 font-normal">· מוגדר</span>}
                </label>
                <input value={apiToken} onChange={(e) => setApiToken(e.target.value)} dir="ltr"
                  onFocus={(e) => { if (apiToken.includes("…")) { setApiToken(""); } e.currentTarget.select?.(); }}
                  placeholder="הדביקו את הטוקן"
                  className="focus-ring w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              מהקונסולה של GreenAPI העתיקו את <code className="bg-slate-100 px-1 rounded">idInstance</code> ואת
              <code className="bg-slate-100 px-1 rounded mx-1">apiTokenInstance</code>. סרקו את ה-QR מהוואטסאפ שממנו
              תשלחו, ואז לחצו "בדוק חיבור ושמור".
            </p>
            <div className="flex gap-2 justify-end mt-3">
              <Button variant="secondary" loading={saving} onClick={() => save(false)}>שמור</Button>
              <Button variant="primary" loading={saving} onClick={() => save(true)}>בדוק חיבור ושמור</Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>סגור</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function StatusTile({
  icon, title, ok, okText, badText,
}: { icon: string; title: string; ok: boolean; okText: string; badText: string }) {
  return (
    <div className={clsx(
      "rounded-2xl border p-3 flex items-center gap-2.5",
      ok ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
    )}>
      <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg shadow-soft shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="font-bold text-slate-800 text-sm truncate">{title}</div>
        <div className={clsx(
          "text-xs font-semibold flex items-center gap-1",
          ok ? "text-green-700" : "text-amber-700"
        )}>
          <span className={clsx("w-1.5 h-1.5 rounded-full", ok ? "bg-green-500" : "bg-amber-500")} />
          {ok ? okText : badText}
        </div>
      </div>
    </div>
  );
}
