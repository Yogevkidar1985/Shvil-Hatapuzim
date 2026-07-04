// עזרי פורמט לתצוגה (he-IL). שמירה על ערך גולמי במסד; רק התצוגה מעוצבת.

/** מספר עם מפרידי אלפים, שמירה על דיוק עשרוני. ריק → "" */
export function formatNumber(raw: string): string {
  if (raw === null || raw === undefined || raw === "") return "";
  const s = String(raw).trim();
  // אם כבר מכיל פסיקים/טקסט לא-מספרי — החזר כמו שהוא (שמירה 1:1)
  const cleaned = s.replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || cleaned === "") return s;
  // שמירה על ספרות עשרוניות מקוריות
  const dot = cleaned.indexOf(".");
  const decimals = dot >= 0 ? cleaned.length - dot - 1 : 0;
  return n.toLocaleString("he-IL", {
    minimumFractionDigits: Math.min(decimals, 8),
    maximumFractionDigits: 8,
  });
}

/** תצוגת טלפון ישראלי: 050-123-4567 */
export function formatPhone(raw: string): string {
  if (!raw) return "";
  const d = String(raw).replace(/\D/g, "");
  let local = d;
  if (d.startsWith("972")) local = "0" + d.slice(3);
  if (local.length === 10 && local.startsWith("05")) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  if (local.length === 9) {
    return `${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`;
  }
  return raw;
}

/** תאריך/שעה מקומי */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** תאריך בלבד (יום/חודש/שנה) */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/** מפריד תאריך לשיחה: היום / אתמול / תאריך */
export function formatDaySeparator(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const same = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (same(d, today)) return "היום";
    if (same(d, yesterday)) return "אתמול";
    return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

export function formatTimeOnly(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
