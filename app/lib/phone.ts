// נרמול מספרי טלפון ישראליים לפורמט GreenAPI (chatId)
// כללים: הסרת תווים שאינם ספרות → טיפול בקידומת 972 / 00972 / +972 → הסרת 0 מוביל → הוספת 972.

export interface NormalizedPhone {
  /** מספר בפורמט בינלאומי ללא סימנים, למשל "972501234567" */
  msisdn: string;
  /** מזהה צ'אט ל-GreenAPI, למשל "972501234567@c.us" */
  chatId: string;
}

/**
 * מנרמל מספר טלפון ישראלי. מחזיר null אם המספר אינו תקין.
 */
export function normalizeIsraeliPhone(raw: string | null | undefined): NormalizedPhone | null {
  if (!raw) return null;

  // השאר ספרות בלבד (מסיר רווחים, מקפים, סוגריים, +, וגם סיומת @c.us אם קיימת)
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  // טיפול בקידומת חיוג בינלאומי 00 (למשל 00972...)
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // אם כבר מתחיל ב-972
  if (digits.startsWith("972")) {
    let rest = digits.slice(3);
    // לעיתים נשמר כ-9720XXXXXXXX — הסר את ה-0 המוביל המיותר
    rest = rest.replace(/^0+/, "");
    digits = "972" + rest;
  } else {
    // מספר מקומי: הסר 0 מוביל והוסף 972
    digits = "972" + digits.replace(/^0+/, "");
  }

  // ולידציית אורך: מספר נייד ישראלי = 972 + 9 ספרות (סהכ 12). קווי = 972 + 8/9.
  const national = digits.slice(3);
  if (national.length < 8 || national.length > 9) {
    return null;
  }

  return {
    msisdn: digits,
    chatId: `${digits}@c.us`,
  };
}

/** בדיקה מהירה אם מספר תקין לשליחה */
export function isValidIsraeliPhone(raw: string | null | undefined): boolean {
  return normalizeIsraeliPhone(raw) !== null;
}

/** המרת chatId חזרה למספר תצוגה, למשל "972501234567@c.us" → "0501234567" */
export function chatIdToLocal(chatId: string): string {
  const digits = chatId.replace(/@c\.us$/, "").replace(/\D/g, "");
  if (digits.startsWith("972")) {
    return "0" + digits.slice(3);
  }
  return digits;
}

/**
 * קישור שליחה ידנית — פותח את WhatsApp (במחשב או בטלפון) עם ההודעה מוכנה.
 * מחזיר null אם המספר אינו תקין.
 */
export function waMeLink(phone: string | null | undefined, text: string): string | null {
  const n = normalizeIsraeliPhone(phone);
  if (!n) return null;
  return `https://wa.me/${n.msisdn}?text=${encodeURIComponent(text)}`;
}
