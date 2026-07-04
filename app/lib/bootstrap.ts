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

/**
 * טעינה אוטומטית של כל אנשי הקשר (116 בעלי הזכויות מגוש 6446) בכניסה הראשונה.
 * רץ רק כשטבלת בעלי הזכויות ריקה לחלוטין — לעולם לא דורס נתונים קיימים.
 */
export async function ensureInitialHolders(): Promise<void> {
  if (ensuredHolders) return;
  try {
    const count = await prisma.rightsHolder.count();
    if (count === 0) {
      const owners = initialOwners as InitialOwner[];

      // עמודות דינמיות עבור שדות ההקצאה (חלקות, שטח, מגרש, שווי וכו')
      const customKeys: string[] = [];
      for (const o of owners) {
        for (const k of Object.keys(o.extra ?? {})) {
          if (!customKeys.includes(k)) customKeys.push(k);
        }
      }
      const existingCols = await prisma.columnDef.findMany();
      const existingKeys = new Set(existingCols.map((c) => c.key));
      let order = existingCols.reduce((m, c) => Math.max(m, c.order), 0);
      for (const key of customKeys) {
        if (!existingKeys.has(key)) {
          order++;
          await prisma.columnDef.create({
            data: { key, label: key, type: "text", order, visible: true, isCustom: true, options: "[]" },
          });
        }
      }

      await prisma.rightsHolder.createMany({
        data: owners.map((o) => ({
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
