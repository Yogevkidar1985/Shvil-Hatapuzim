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

export const DEFAULT_TEMPLATES: { name: string; text: string }[] = [
  {
    name: "פנייה ראשונית",
    text:
      "שלום {שם}, מדברים מצוות שביל התפוזים בהוד השרון. נשמח לעדכן אותך בנוגע לזכויותיך במתחם. נוח לך שנחזור אליך?",
  },
  {
    name: "תזכורת חתימה",
    text:
      "שלום {שם}, רצינו להזכיר כי טרם התקבלה חתימתך על המסמכים בנוגע למתחם שביל התפוזים. נשמח לעמוד לרשותך לכל שאלה.",
  },
  {
    name: "תיאום פגישה",
    text:
      "שלום {שם}, נשמח לתאם פגישה אישית להצגת הפרטים המלאים בנוגע לזכויותיך. מתי נוח לך השבוע?",
  },
];
