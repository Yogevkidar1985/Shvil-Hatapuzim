// קליינט GreenAPI — נקרא אך ורק מצד שרת (API routes). הסודות נשמרים ב-env בלבד.
import { normalizeIsraeliPhone } from "./phone";

export interface GreenApiConfig {
  idInstance: string;
  apiToken: string;
  apiUrl: string;
  mediaUrl: string;
}

export class GreenApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "GreenApiError";
    this.status = status;
  }
}

/** טוען את תצורת GreenAPI מ-env. זורק אם חסרים ערכים. */
export function getGreenApiConfig(): GreenApiConfig {
  const idInstance = process.env.GREENAPI_ID_INSTANCE;
  const apiToken = process.env.GREENAPI_API_TOKEN;
  if (!idInstance || !apiToken) {
    throw new GreenApiError(
      "GreenAPI אינו מוגדר. הגדירו GREENAPI_ID_INSTANCE ו-GREENAPI_API_TOKEN בקובץ .env.local"
    );
  }
  return {
    idInstance,
    apiToken,
    apiUrl: process.env.GREENAPI_API_URL || "https://api.green-api.com",
    mediaUrl: process.env.GREENAPI_MEDIA_URL || "https://media.green-api.com",
  };
}

/** האם GreenAPI מוגדר (לבדיקת UI ללא חשיפת הסודות) */
export function isGreenApiConfigured(): boolean {
  return Boolean(process.env.GREENAPI_ID_INSTANCE && process.env.GREENAPI_API_TOKEN);
}

async function call<T>(
  cfg: GreenApiConfig,
  method: string,
  body: unknown,
  baseUrl?: string,
  attempt = 0
): Promise<T> {
  const url = `${baseUrl ?? cfg.apiUrl}/waInstance${cfg.idInstance}/${method}/${cfg.apiToken}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // retry עם backoff על שגיאות שרת זמניות
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        return call<T>(cfg, method, body, baseUrl, attempt + 1);
      }
      throw new GreenApiError(`GreenAPI ${method} נכשל (${res.status}): ${text}`, res.status);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof GreenApiError) throw err;
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      return call<T>(cfg, method, body, baseUrl, attempt + 1);
    }
    throw new GreenApiError(
      `שגיאת רשת בקריאה ל-GreenAPI: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

export interface SendMessageResult {
  idMessage: string;
}

/** שליחת הודעת טקסט. phone מנורמל אוטומטית למספר ישראלי. */
export async function sendTextMessage(
  cfg: GreenApiConfig,
  phone: string,
  message: string
): Promise<SendMessageResult> {
  const normalized = normalizeIsraeliPhone(phone);
  if (!normalized) {
    throw new GreenApiError(`מספר טלפון לא תקין: "${phone}"`);
  }
  return call<SendMessageResult>(cfg, "sendMessage", {
    chatId: normalized.chatId,
    message,
  });
}

/** בדיקת מצב החשבון (state instance) */
export async function getStateInstance(
  cfg: GreenApiConfig
): Promise<{ stateInstance: string }> {
  const url = `${cfg.apiUrl}/waInstance${cfg.idInstance}/getStateInstance/${cfg.apiToken}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new GreenApiError(`getStateInstance נכשל (${res.status})`, res.status);
  }
  return res.json();
}

// ===== ניהול קבוצות WhatsApp =====

export interface CreateGroupResult {
  created: boolean;
  chatId: string; // מזהה הקבוצה, למשל 1203…@g.us
  groupInviteLink: string;
}

/** יצירת קבוצה חדשה עם רשימת משתתפים ראשונית (chatIds בפורמט 972…@c.us) */
export async function createGroup(
  cfg: GreenApiConfig,
  groupName: string,
  chatIds: string[]
): Promise<CreateGroupResult> {
  return call<CreateGroupResult>(cfg, "createGroup", { groupName, chatIds });
}

/** הוספת משתתף לקבוצה קיימת. מחזיר false אם ההוספה נחסמה (הגדרות פרטיות) */
export async function addGroupParticipant(
  cfg: GreenApiConfig,
  groupId: string,
  participantChatId: string
): Promise<boolean> {
  const res = await call<{ addParticipant: boolean }>(cfg, "addGroupParticipant", {
    groupId,
    participantChatId,
  });
  return Boolean(res?.addParticipant);
}

export interface GroupData {
  groupId: string;
  subject: string;
  groupInviteLink?: string;
  participants: { id: string; isAdmin?: boolean }[];
}

/** נתוני קבוצה — כולל רשימת המשתתפים בפועל (לסנכרון "מי נכנס") */
export async function getGroupData(cfg: GreenApiConfig, groupId: string): Promise<GroupData> {
  return call<GroupData>(cfg, "getGroupData", { groupId });
}

/** שליחת הודעה ל-chatId גולמי (כולל קבוצות @g.us) — ללא נרמול טלפון */
export async function sendRawMessage(
  cfg: GreenApiConfig,
  chatId: string,
  message: string
): Promise<SendMessageResult> {
  return call<SendMessageResult>(cfg, "sendMessage", { chatId, message });
}

/** בדיקה האם למספר יש חשבון WhatsApp (ניהול נכון של מספרי טלפון) */
export async function checkWhatsapp(cfg: GreenApiConfig, phone: string): Promise<boolean | null> {
  const normalized = normalizeIsraeliPhone(phone);
  if (!normalized) return null;
  const res = await call<{ existsWhatsapp: boolean }>(cfg, "checkWhatsapp", {
    phoneNumber: Number(normalized.msisdn),
  });
  return Boolean(res?.existsWhatsapp);
}

// ===== קבלת הודעות נכנסות בשיטת polling (חלופה ל-webhook) =====

export interface IncomingNotification {
  receiptId: number;
  body: {
    typeWebhook: string;
    senderData?: { chatId: string; sender: string; senderName?: string };
    messageData?: {
      typeMessage: string;
      textMessageData?: { textMessage: string };
      extendedTextMessageData?: { text: string };
    };
    idMessage?: string;
    timestamp?: number;
  };
}

export async function receiveNotification(
  cfg: GreenApiConfig
): Promise<IncomingNotification | null> {
  const url = `${cfg.apiUrl}/waInstance${cfg.idInstance}/receiveNotification/${cfg.apiToken}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new GreenApiError(`receiveNotification נכשל (${res.status})`, res.status);
  const data = await res.text();
  if (!data || data === "null") return null;
  return JSON.parse(data) as IncomingNotification;
}

export async function deleteNotification(
  cfg: GreenApiConfig,
  receiptId: number
): Promise<void> {
  const url = `${cfg.apiUrl}/waInstance${cfg.idInstance}/deleteNotification/${cfg.apiToken}/${receiptId}`;
  await fetch(url, { method: "DELETE" });
}
