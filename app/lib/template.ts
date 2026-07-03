// החלפת משתנים בתבניות הודעה. תומך ב-{שם}, {טלפון}, {מצב}, {שווי} ועוד.
import type { HolderDTO } from "./types";

export function renderTemplate(template: string, holder: HolderDTO): string {
  const vars: Record<string, string> = {
    "שם": holder.name,
    "טלפון": holder.phone,
    "מצב": holder.state,
    "שווי": holder.relativeValue,
    "שווי יחסי": holder.relativeValue,
    "משלם": holder.balancePay,
    "מקבל": holder.balanceReceive,
    "הערות": holder.notes,
  };
  // הוסף ערכים מעמודות דינמיות
  for (const [k, v] of Object.entries(holder.extra || {})) {
    vars[k] = v;
  }
  return template.replace(/\{([^}]+)\}/g, (match, name) => {
    const key = String(name).trim();
    return key in vars ? vars[key] : match;
  });
}

/** משתנים זמינים לשילוב בתבניות (מוחלפים בערכי בעל הזכויות בשליחה) */
export const TEMPLATE_VARS: { token: string; label: string }[] = [
  { token: "{שם}", label: "שם" },
  { token: "{טלפון}", label: "טלפון" },
  { token: "{מצב}", label: "מצב" },
  { token: "{שווי}", label: "שווי יחסי" },
  { token: "{משלם}", label: "משלם" },
  { token: "{מקבל}", label: "מקבל" },
  { token: "{הערות}", label: "הערות" },
];

export const DEFAULT_TEMPLATES: { name: string; text: string }[] = [
  {
    name: "פנייה ראשונית",
    text:
      "שלום {שם}, מדברים מצוות ניהול הבעלים בפרויקט גוש 6446, הוד השרון (תכנית 423-0099697). נשמח לעדכן אותך בנוגע לזכויותיך. נוח לך שנחזור אליך?",
  },
  {
    name: "תזכורת חתימה",
    text:
      "שלום {שם}, רצינו להזכיר כי טרם התקבלה חתימתך על מסמכי ההקצאה והאיזון בפרויקט גוש 6446. נשמח לעמוד לרשותך לכל שאלה.",
  },
  {
    name: "תיאום פגישה",
    text:
      "שלום {שם}, נשמח לתאם פגישה אישית להצגת הפרטים המלאים בנוגע לזכויותיך בפרויקט. מתי נוח לך השבוע?",
  },
];
