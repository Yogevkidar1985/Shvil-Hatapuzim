// אתחול אוטומטי: מוודא שעמודות ברירת המחדל קיימות. נקרא בכל טעינת עמודות/שורות,
// כך שהמערכת עובדת מיד גם על מסד נתונים ריק (פריסה חדשה ב-Netlify) ללא הרצת seed ידנית.
import { prisma } from "./db";
import { DEFAULT_COLUMNS } from "./types";
import { DEFAULT_TEMPLATES } from "./template";

let ensured = false;
let ensuredTpl = false;

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
