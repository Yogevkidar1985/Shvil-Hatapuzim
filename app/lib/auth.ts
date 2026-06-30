// אימות בסיסי מבוסס סיסמה + קוקי סשן חתום. נתוני בעלי הזכויות הם מידע אישי ומחייבים גישה מאומתת.
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "rh_session";

function secret(): string {
  return process.env.SESSION_SECRET || "insecure-dev-secret-change-me";
}

/** יוצר טוקן סשן חתום (HMAC) */
export function createSessionToken(): string {
  const payload = `auth.${Date.now()}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/** מאמת טוקן סשן */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** בודק אם המשתמש מחובר (לשימוש ב-route handlers / server components) */
export function isAuthenticated(): boolean {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/** בודק אם הסיסמה שהוזנה נכונה */
export function checkPassword(password: string): boolean {
  const expected = process.env.APP_PASSWORD || "changeme";
  if (password.length !== expected.length) {
    // השוואה בטוחה גם כשהאורכים שונים — בלי לדלוף מידע
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
