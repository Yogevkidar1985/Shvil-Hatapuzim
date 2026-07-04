// אתחול אוטומטי: מוודא שעמודות ברירת המחדל קיימות. נקרא בכל טעינת עמודות/שורות,
// כך שהמערכת עובדת מיד גם על מסד נתונים ריק (פריסה חדשה ב-Netlify) ללא הרצת seed ידנית.
import { prisma } from "./db";
import { DEFAULT_COLUMNS } from "./types";
import { DEFAULT_TEMPLATES } from "./template";
import initialOwners from "@/prisma/initial-owners.json";

let ensured = false;
let ensuredTpl = false;
let ensuredHolders = false;
let ensuredLegacyTpl = false;
let ensuredLegacyOwners = false;

export async function ensureDefaultColumns(): Promise<void> {
  if (ensured) return;
  try {
    const count = await prisma.columnDef.count();
    if (count === 0) {
      await prisma.$transaction(
        DEFAULT_COLUMNS.map((c) =>
          prisma.columnDef.create({
            data: {
              key: c.key,
              label: c.label,
              type: c.type,
              order: c.order,
              visible: c.visible,
              isCustom: c.isCustom,
              options: JSON.stringify(c.options),
            },
          })
        )
      );
    }
    ensured = true;
  } catch {
    // אם הטבלאות עדיין לא קיימות (db push לא רץ) — לא מפילים את הבקשה
  }
}

interface InitialOwner {
  name: string;
  phone: string;
  status: string;
  notes: string;
  rowOrder: number;
  extra: Record<string, string>;
}

/** שם מנורמל: רווחים מכווצים */
function collapsedKey(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** מפתח עם מילים ממוינות — תופס "כהן דוד" מול "דוד כהן" */
function sortedKey(name: string): string {
  return collapsedKey(name).split(" ").sort().join(" ");
}

function phoneKey(phone: string): string {
  return String(phone ?? "").replace(/\D/g, "");
}

/**
 * טעינה אוטומטית של כל 116 בעלי הזכויות מגוש 6446 — משלימה את מי שחסר.
 * לא נוגעת ברשומות קיימות ולא יוצרת כפילויות: התאמה לפי שם מנורמל
 * (כולל סדר מילים הפוך) או לפי מספר טלפון.
 */
export async function ensureInitialHolders(): Promise<void> {
  if (ensuredHolders) return;
  try {
    const owners = initialOwners as InitialOwner[];

    // עמודות דינמיות עבור שדות ההקצאה (חלקות, שטח, מגרש, שווי וכו')
    const customKeys: string[] = [];
    for (const o of owners) {
      for (const k of Object.keys(o.extra ?? {})) {
        if (!customKeys.includes(k)) customKeys.push(k);
      }
    }
    const existingCols = await prisma.columnDef.findMany();
    const existingColKeys = new Set(existingCols.map((c) => c.key));
    let order = existingCols.reduce((m, c) => Math.max(m, c.order), 0);
    for (const key of customKeys) {
      if (!existingColKeys.has(key)) {
        order++;
        await prisma.columnDef.create({
          data: { key, label: key, type: "text", order, visible: true, isCustom: true, options: "[]" },
        });
      }
    }

    // שמות שהמסמך המקורי עצמו מכיל בשני סדרי מילים ("זאב שחור" וגם "שחור זאב")
    // הם אנשים שונים — עבורם ההתאמה חייבת להיות מדויקת, לא לפי מילים ממוינות.
    const sortedCount = new Map<string, number>();
    for (const o of owners) {
      const k = sortedKey(o.name);
      sortedCount.set(k, (sortedCount.get(k) ?? 0) + 1);
    }

    // אינדקס הרשומות הקיימות — לפי שם מנורמל ולפי טלפון
    const existing = await prisma.rightsHolder.findMany({
      select: { name: true, phone: true },
    });
    const seen = new Set<string>();
    for (const h of existing) {
      const c = collapsedKey(h.name);
      if (c) {
        seen.add(`n:${c}`);
        seen.add(`s:${sortedKey(h.name)}`);
      }
      const p = phoneKey(h.phone);
      if (p) seen.add(`p:${p}`);
    }

    const missing = owners.filter((o) => {
      const c = collapsedKey(o.name);
      if (c && seen.has(`n:${c}`)) return false;
      const s = sortedKey(o.name);
      const ambiguous = (sortedCount.get(s) ?? 0) > 1;
      if (c && !ambiguous && seen.has(`s:${s}`)) return false;
      const p = phoneKey(o.phone);
      if (p !== "" && seen.has(`p:${p}`)) return false;
      return true;
    });

    if (missing.length > 0) {
      await prisma.rightsHolder.createMany({
        data: missing.map((o) => ({
          name: o.name,
          phone: o.phone,
          status: ["pending", "signed", "objected"].includes(o.status) ? o.status : "pending",
          notes: o.notes,
          rowOrder: o.rowOrder,
          extra: JSON.stringify(o.extra ?? {}),
        })),
      });
    }
    ensuredHolders = true;
  } catch {
    /* טבלה עדיין לא קיימת — מתעלמים */
  }
  // אחרי השלמת 116 הבסיסיים — ייבוא כל העריכות מהמערכת הישנה (השלמת חוסרים)
  await importLegacyOwners();
}

/** מוודא שתבניות ברירת המחדל קיימות (פעם ראשונה בלבד) */
export async function ensureDefaultTemplates(): Promise<void> {
  if (ensuredTpl) return;
  try {
    const count = await prisma.messageTemplate.count();
    if (count === 0) {
      await prisma.$transaction(
        DEFAULT_TEMPLATES.map((t, i) =>
          prisma.messageTemplate.create({ data: { name: t.name, body: t.text, order: i } })
        )
      );
    }
    ensuredTpl = true;
  } catch {
    /* טבלה עדיין לא קיימת — מתעלמים */
  }
  await importLegacyTemplates();
}

interface LegacyTemplate {
  id?: string;
  title?: string;
  body?: string;
}

/** רשומת בעלים כפי שהמערכת הישנה שומרת אותה ב-app_state */
interface LegacyOwner {
  name?: string;
  phone?: string;
  signed?: boolean;
  lastUpdate?: string;
  plotsText?: string;
  totalArea?: number | string | null;
  allocMigrash?: (number | string)[];
  allocShoviYotze?: number | string | null;
  tabuNotes?: string;
  period?: string;
}

const LEGACY_APP_STATE_ID = "hod-hasharon-6446";

/** קריאת מצב המערכת הישנה מטבלת app_state (public) — null אם אין */
async function readLegacyState(): Promise<any | null> {
  let rows: { data: unknown }[] = [];
  try {
    rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
      `SELECT data FROM public.app_state WHERE id = '${LEGACY_APP_STATE_ID}'`
    );
  } catch {
    // SQLite (פיתוח מקומי) לא מכיר סכמת public — ניסיון ללא קידומת
    rows = await prisma.$queryRawUnsafe<{ data: unknown }[]>(
      `SELECT data FROM app_state WHERE id = '${LEGACY_APP_STATE_ID}'`
    );
  }
  if (!rows.length) return null;
  let data: any = rows[0].data;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { return null; }
  }
  return data ?? null;
}

/**
 * ייבוא הודעות/תבניות שנכתבו במערכת הישנה (gush6446 הסטטית).
 * המערכת הישנה שומרת {owners, templates} בטבלת app_state (סכמת public באותו
 * Supabase) תחת המזהה hod-hasharon-6446. מייבאים כל תבנית שטרם קיימת אצלנו;
 * אם השם תפוס אך התוכן שונה — נשמרת בשם עם סיומת "(מהמערכת הישנה)".
 */
export async function importLegacyTemplates(): Promise<void> {
  if (ensuredLegacyTpl) return;
  try {
    const data = await readLegacyState();
    if (!data) {
      ensuredLegacyTpl = true;
      return;
    }
    const legacy: LegacyTemplate[] = Array.isArray(data?.templates) ? data.templates : [];
    if (legacy.length === 0) {
      ensuredLegacyTpl = true;
      return;
    }

    const existing = await prisma.messageTemplate.findMany();
    const names = new Set(existing.map((t) => t.name.trim()));
    const bodies = new Set(existing.map((t) => t.body.trim()));
    let order = existing.reduce((m, t) => Math.max(m, t.order), 0);

    for (const t of legacy) {
      const title = String(t.title ?? "").trim();
      const body = String(t.body ?? "").trim();
      if (!body) continue;
      if (bodies.has(body)) continue; // תוכן זהה כבר קיים — אין מה לייבא
      let name = title || "הודעה מהמערכת הישנה";
      if (names.has(name)) name = `${name} (מהמערכת הישנה)`;
      if (names.has(name)) continue; // כבר יובא בעבר
      order++;
      await prisma.messageTemplate.create({ data: { name, body, order } });
      names.add(name);
      bodies.add(body);
    }
    ensuredLegacyTpl = true;
  } catch {
    /* טבלת app_state לא קיימת (אין נתוני מערכת ישנה) — מתעלמים */
  }
}

/** מיפוי שדות המערכת הישנה → עמודות ה-extra של המערכת החדשה */
function legacyExtra(o: LegacyOwner): Record<string, string> {
  const out: Record<string, string> = {};
  if (o.plotsText) out["חלקות ושטחים"] = String(o.plotsText);
  if (o.totalArea !== null && o.totalArea !== undefined && o.totalArea !== "")
    out["שטח כ״ס (מ״ר)"] = String(o.totalArea);
  if (Array.isArray(o.allocMigrash) && o.allocMigrash.length)
    out["מגרש תמורה"] = o.allocMigrash.join(", ");
  if (o.allocShoviYotze !== null && o.allocShoviYotze !== undefined && o.allocShoviYotze !== "")
    out["שווי מצב יוצא"] = String(o.allocShoviYotze);
  if (o.tabuNotes) out["הערות נסח טאבו"] = String(o.tabuNotes);
  return out;
}

/**
 * ייבוא כל נתוני הבעלים מהמערכת הישנה (טלפונים, מי חתם, עדכונים, הערות טאבו וכו').
 * מדיניות: השלמת חוסרים בלבד — ערך שכבר הוזן במערכת החדשה לעולם לא נדרס.
 * בעלים שקיימים רק במערכת הישנה נוספים כרשומות חדשות בסוף הטבלה.
 */
export async function importLegacyOwners(): Promise<void> {
  if (ensuredLegacyOwners) return;
  try {
    const data = await readLegacyState();
    const legacy: LegacyOwner[] = Array.isArray(data?.owners) ? data.owners : [];
    if (legacy.length === 0) {
      ensuredLegacyOwners = true;
      return;
    }

    const holders = await prisma.rightsHolder.findMany();
    const byName = new Map<string, (typeof holders)[number]>();
    const byPhone = new Map<string, (typeof holders)[number]>();
    for (const h of holders) {
      const c = collapsedKey(h.name);
      if (c && !byName.has(c)) byName.set(c, h);
      const s = sortedKey(h.name);
      if (s && !byName.has(`s:${s}`)) byName.set(`s:${s}`, h);
      const p = phoneKey(h.phone);
      if (p && !byPhone.has(p)) byPhone.set(p, h);
    }
    let maxOrder = holders.reduce((m, h) => Math.max(m, h.rowOrder), 0);

    for (const o of legacy) {
      const name = String(o.name ?? "").trim();
      if (!name) continue;
      const c = collapsedKey(name);
      const p = phoneKey(String(o.phone ?? ""));
      const match =
        byName.get(c) ?? byName.get(`s:${sortedKey(name)}`) ?? (p ? byPhone.get(p) : undefined);

      const extraFromLegacy = legacyExtra(o);

      if (!match) {
        // בעלים שקיים רק במערכת הישנה — נוסף כרשומה חדשה
        maxOrder++;
        const created = await prisma.rightsHolder.create({
          data: {
            name,
            phone: String(o.phone ?? "").trim(),
            status: o.signed ? "signed" : "pending",
            notes: String(o.lastUpdate ?? "").trim(),
            rowOrder: maxOrder,
            extra: JSON.stringify(extraFromLegacy),
          },
        });
        byName.set(collapsedKey(name), created);
        continue;
      }

      // השלמת חוסרים בלבד — לא דורסים ערכים שהוזנו במערכת החדשה
      const updates: Record<string, unknown> = {};
      if (!match.phone.trim() && String(o.phone ?? "").trim()) {
        updates.phone = String(o.phone).trim();
      }
      if (match.status === "pending" && o.signed) {
        updates.status = "signed";
      }
      if (!match.notes.trim() && String(o.lastUpdate ?? "").trim()) {
        updates.notes = String(o.lastUpdate).trim();
      }
      let extra: Record<string, string> = {};
      try { extra = JSON.parse(match.extra); } catch { extra = {}; }
      let extraChanged = false;
      for (const [k, v] of Object.entries(extraFromLegacy)) {
        if (!String(extra[k] ?? "").trim() && v) {
          extra[k] = v;
          extraChanged = true;
        }
      }
      if (extraChanged) updates.extra = JSON.stringify(extra);
      if (Object.keys(updates).length > 0) {
        await prisma.rightsHolder.update({ where: { id: match.id }, data: updates });
      }
    }
    ensuredLegacyOwners = true;
  } catch {
    /* טבלת app_state לא קיימת (אין נתוני מערכת ישנה) — מתעלמים */
  }
}
