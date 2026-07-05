// עטיפות fetch לצד לקוח. כל הקריאות מחזירות JSON וזורקות שגיאה ידידותית בעברית.
import type { HolderDTO, ColumnDefDTO, MessageDTO, GroupDTO, TemplateDTO } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* תגובה ריקה */
  }
  if (!res.ok) {
    throw new Error(data?.error || `שגיאת שרת (${res.status})`);
  }
  return data as T;
}

export const api = {
  // ===== בעלי זכויות =====
  listHolders: () => request<{ holders: HolderDTO[] }>("/api/holders"),
  createHolder: (data: Partial<HolderDTO>) =>
    request<{ holder: HolderDTO }>("/api/holders", { method: "POST", body: JSON.stringify(data) }),
  updateHolder: (id: string, data: Partial<HolderDTO> & { extra?: Record<string, string> }) =>
    request<{ holder: HolderDTO }>(`/api/holders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteHolder: (id: string) =>
    request<{ ok: boolean }>(`/api/holders/${id}`, { method: "DELETE" }),

  // ===== עמודות =====
  listColumns: () => request<{ columns: ColumnDefDTO[] }>("/api/columns"),
  createColumn: (data: { label: string; type: string; options?: string[] }) =>
    request<{ column: ColumnDefDTO }>("/api/columns", { method: "POST", body: JSON.stringify(data) }),
  updateColumns: (columns: Partial<ColumnDefDTO>[]) =>
    request<{ columns: ColumnDefDTO[] }>("/api/columns", { method: "PUT", body: JSON.stringify({ columns }) }),
  deleteColumn: (id: string) =>
    request<{ ok: boolean }>(`/api/columns/${id}`, { method: "DELETE" }),

  // ===== ייבוא =====
  importRows: (rows: Record<string, unknown>[], mapping: Record<string, string>, replace: boolean) =>
    request<{ ok: boolean; count: number; holders: HolderDTO[] }>("/api/import", {
      method: "POST",
      body: JSON.stringify({ rows, mapping, replace }),
    }),

  // ===== WhatsApp =====
  whatsappStatus: () => request<{ configured: boolean; state: string | null }>("/api/whatsapp/status"),
  getMessages: (holderId: string) =>
    request<{ messages: MessageDTO[] }>(`/api/whatsapp/messages/${holderId}`),
  sendMessage: (holderId: string, message: string, templateName?: string | null) =>
    request<{ ok: boolean; message: MessageDTO; error?: string }>("/api/whatsapp/send", {
      method: "POST",
      body: JSON.stringify({ holderId, message, templateName: templateName ?? null }),
    }),
  syncMessages: () =>
    request<{ ok: boolean; processed: number; saved: number }>("/api/whatsapp/sync", { method: "POST" }),
  // תיעוד שליחה ידנית (wa.me) — המסלול החינמי ללא GreenAPI
  logManualSend: (holderId: string, message: string, templateName?: string | null) =>
    request<{ ok: boolean; message: MessageDTO }>("/api/whatsapp/manual", {
      method: "POST",
      body: JSON.stringify({ holderId, message, templateName: templateName ?? null }),
    }),

  // ===== הגדרות מערכת (נשמרות בענן) =====
  getSettings: () =>
    request<{
      cloud: { connected: boolean; provider: string };
      greenApi: { idInstance: string; apiTokenMasked: string; hasToken: boolean; apiUrl: string; source: string };
    }>("/api/settings"),
  saveSettings: (data: { idInstance?: string; apiToken?: string; apiUrl?: string; test?: boolean }) =>
    request<{ ok: boolean; tested?: boolean; state?: string; error?: string }>("/api/settings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ===== תבניות הודעה =====
  listTemplates: () => request<{ templates: TemplateDTO[] }>("/api/templates"),
  createTemplate: (name: string, body: string) =>
    request<{ template: TemplateDTO }>("/api/templates", {
      method: "POST",
      body: JSON.stringify({ name, body }),
    }),
  updateTemplate: (id: string, data: { name?: string; body?: string }) =>
    request<{ template: TemplateDTO }>(`/api/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTemplate: (id: string) =>
    request<{ ok: boolean }>(`/api/templates/${id}`, { method: "DELETE" }),

  // ===== מניעת כפילויות =====
  checkDuplicates: (holderIds: string[], template: string) =>
    request<{ checks: DuplicateCheck[] }>("/api/whatsapp/duplicates", {
      method: "POST",
      body: JSON.stringify({ holderIds, template }),
    }),

  // ===== קבוצות WhatsApp =====
  listGroups: () => request<{ groups: GroupDTO[] }>("/api/whatsapp/groups"),
  createGroup: (name: string, holderIds: string[]) =>
    request<{ ok: boolean; group: GroupDTO; results: GroupMemberResult[] }>("/api/whatsapp/groups", {
      method: "POST",
      body: JSON.stringify({ name, holderIds }),
    }),
  addToGroup: (groupId: string, holderId: string) =>
    request<{ result: MemberOpResult; error?: string }>("/api/whatsapp/groups/add", {
      method: "POST",
      body: JSON.stringify({ groupId, holderId }),
    }),
  sendGroupInvite: (groupId: string, holderId: string) =>
    request<{ result: MemberOpResult; error?: string }>("/api/whatsapp/groups/invite", {
      method: "POST",
      body: JSON.stringify({ groupId, holderId }),
    }),
  syncGroups: () =>
    request<{ ok: boolean; joined: number; left: number; checkedGroups: number }>(
      "/api/whatsapp/groups/sync",
      { method: "POST" }
    ),

  // ===== בדיקת תקינות מספרים (מנות קטנות — קוראים בלולאה עד remaining=0) =====
  checkPhones: (holderIds?: string[]) =>
    request<{ ok: boolean; checked: number; valid: number; invalid: number; remaining: number }>(
      "/api/whatsapp/check",
      {
        method: "POST",
        body: JSON.stringify({ holderIds: holderIds ?? [] }),
      }
    ),

  // ===== שלב 2: חתומים =====
  matchSigners: (signerNames: string[]) =>
    request<{ suggestions: SignerSuggestion[] }>("/api/signers/match", {
      method: "POST",
      body: JSON.stringify({ signerNames }),
    }),
  applySigners: (apply: { holderId: string; status: string }[]) =>
    request<{ ok: boolean; applied: number }>("/api/signers/match", {
      method: "POST",
      body: JSON.stringify({ apply }),
    }),

  // ===== אימות =====
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
};

export interface DuplicateCheck {
  holderId: string;
  sentCount: number;
  duplicate: boolean;
}

export type MemberOpResult = "added" | "invite_needed" | "invited" | "failed" | "skipped";

export interface GroupMemberResult {
  holderId: string;
  name: string;
  result: MemberOpResult;
  error?: string;
}

export interface SignerSuggestion {
  signerName: string;
  holderId: string | null;
  holderName: string | null;
  currentStatus: string | null;
  score: number;
  confidence: "exact" | "fuzzy" | "none";
  autoApprove: boolean;
}
