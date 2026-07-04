// אתחול אוטומטי: מוודא שעמודות ברירת המחדל קיימות. נקרא בכל טעינת עמודות/שורות,
// כך שהמערכת עובדת מיד גם על מסד נתונים ריק (פריסה חדשה ב-Netlify) ללא הרצת seed ידנית.
import { prisma } from "./db";
import { DEFAULT_COLUMNS } from "./types";
import { DEFAULT_TEMPLATES } from "./template";
import initialOwners from "@/prisma/initial-owners.json";

let ensured = false;
let ensuredTpl = false;
let ensuredHolders = false;

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
}
