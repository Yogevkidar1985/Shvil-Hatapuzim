// לוגיקת מיפוי ייבוא Excel/CSV → שדות בעל זכויות. שמירה 1:1 על ערכים (ללא עיגול / איבוד אפסים).
import type { BuiltinKey } from "./types";

/** כינויים אפשריים לכותרות העמודות בקובץ המקורי (עברית) → מפתח שדה */
const HEADER_ALIASES: Record<string, BuiltinKey> = {
  "בעל הזכויות": "name",
  "בעל זכויות": "name",
  "שם": "name",
  "שם מלא": "name",
  "שווי יחסי": "relativeValue",
  "חלק יחסי": "relativeValue",
  "מצב": "state",
  "תשלומי איזון — משלם": "balancePay",
  "תשלומי איזון - משלם": "balancePay",
  "משלם": "balancePay",
  "תשלומי איזון — מקבל": "balanceReceive",
  "תשלומי איזון - מקבל": "balanceReceive",
  "מקבל": "balanceReceive",
  "טלפון": "phone",
  "נייד": "phone",
  "טלפון נייד": "phone",
  "הערות": "notes",
  "סטטוס": "status",
  "סטטוס חתימה": "status",
  "חתימה": "status",
  "חתם": "status",
};

function normalizeHeader(h: string): string {
  return String(h ?? "").replace(/\s+/g, " ").trim();
}

/** מנרמל ערך סטטוס חתימה מהקובץ לערך המערכת (signed/objected/pending) */
export function normalizeStatusValue(raw: string): "pending" | "signed" | "objected" {
  const v = String(raw ?? "").trim().toLowerCase();
  if (["signed", "חתם", "חתמו", "כן", "yes", "true", "✓", "v"].includes(v)) return "signed";
  if (["objected", "התנגד", "התנגדו", "מתנגד", "no", "לא"].includes(v)) return "objected";
  return "pending";
}

export interface ColumnMapping {
  /** כותרת מקור → מפתח יעד ('' = להתעלם, או מפתח דינמי מותאם אישית) */
  [sourceHeader: string]: string;
}

/** מנחש מיפוי אוטומטי בין כותרות הקובץ לשדות הקיימים */
export function autoMapHeaders(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const h of headers) {
    const norm = normalizeHeader(h);
    mapping[h] = HEADER_ALIASES[norm] ?? "";
  }
  return mapping;
}

/** ממיר ערך תא למחרוזת תוך שמירה מדויקת (ללא איבוד אפסים מובילים / עיגול) */
export function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    // שמירה על דיוק מלא — ללא toLocaleString שעלול לעגל
    return String(value);
  }
  return String(value).trim();
}

export interface ImportRow {
  name: string;
  relativeValue: string;
  state: string;
  balancePay: string;
  balanceReceive: string;
  phone: string;
  status: string;
  notes: string;
  extra: Record<string, string>;
}

export interface ImportPreview {
  headers: string[];
  detectedMapping: ColumnMapping;
  rowCount: number;
  sampleRows: Record<string, string>[];
  errors: string[];
}

/**
 * ממפה מערך אובייקטים (שורות מהקובץ) לשורות בעל זכויות לפי מיפוי נתון.
 * כותרות שממופות למפתח שאינו מובנה נשמרות ב-extra (עמודות דינמיות).
 */
const BUILTIN_SET = new Set<string>([
  "name", "relativeValue", "state", "balancePay", "balanceReceive", "phone", "status", "notes",
]);

export function mapRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping
): ImportRow[] {
  return rows.map((row) => {
    const out: ImportRow = {
      name: "", relativeValue: "", state: "", balancePay: "",
      balanceReceive: "", phone: "", status: "pending", notes: "", extra: {},
    };
    for (const [source, target] of Object.entries(mapping)) {
      if (!target) continue; // התעלמות
      const val = cellToString(row[source]);
      if (target === "status") {
        out.status = normalizeStatusValue(val);
      } else if (BUILTIN_SET.has(target)) {
        (out as unknown as Record<string, string>)[target] = val;
      } else {
        out.extra[target] = val;
      }
    }
    if (!out.status) out.status = "pending";
    return out;
  });
}
