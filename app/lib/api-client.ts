// עטיפות fetch לצד לקוח. כל הקריאות מחזירות JSON וזורקות שגיאה ידידותית בעברית.
import type { HolderDTO, ColumnDefDTO, MessageDTO } from "./types";

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
  sendMessage: (holderId: string, message: string) =>
    request<{ ok: boolean; message: MessageDTO; error?: string }>("/api/whatsapp/send", {
      method: "POST",
      body: JSON.stringify({ holderId, message }),
    }),
  syncMessages: () =>
    request<{ ok: boolean; processed: number; saved: number }>("/api/whatsapp/sync", { method: "POST" }),

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

export interface SignerSuggestion {
  signerName: string;
  holderId: string | null;
  holderName: string | null;
  currentStatus: string | null;
  score: number;
  confidence: "exact" | "fuzzy" | "none";
  autoApprove: boolean;
}
