// טיפוסים משותפים בין צד שרת ללקוח

export type HolderStatus = "pending" | "signed" | "objected";

export type ColumnType = "text" | "number" | "date" | "select" | "status" | "phone";

export interface ColumnDefDTO {
  id: string;
  key: string;
  label: string;
  type: ColumnType;
  order: number;
  visible: boolean;
  isCustom: boolean;
  options: string[];
}

/** סטטוס חברות בקבוצת WhatsApp */
export type GroupStatus = "none" | "added" | "invited" | "left" | "failed";

/** תוצאת בדיקת מספר (checkWhatsapp) */
export type WaCheck = "unknown" | "valid" | "invalid";

/** סיכום הודעות לכל בעל זכויות — מחושב בצד שרת מטבלת ההודעות */
export interface MsgStats {
  out: number; // נשלחו אליו
  in: number; // התקבלו ממנו
  failed: number; // כשלונות שליחה
  lastBody: string | null; // תוכן ההודעה האחרונה
  lastDirection: "in" | "out" | null;
  lastAt: string | null;
}

export const EMPTY_MSG_STATS: MsgStats = {
  out: 0,
  in: 0,
  failed: 0,
  lastBody: null,
  lastDirection: null,
  lastAt: null,
};

export interface HolderDTO {
  id: string;
  name: string;
  relativeValue: string;
  state: string;
  balancePay: string;
  balanceReceive: string;
  phone: string;
  status: HolderStatus;
  notes: string;
  extra: Record<string, string>;
  rowOrder: number;
  lastMessageAt: string | null;
  groupId: string | null;
  groupStatus: GroupStatus;
  groupAddedAt: string | null;
  waCheck: WaCheck;
  msgStats: MsgStats;
  createdAt: string;
  updatedAt: string;
}

export interface GroupDTO {
  id: string;
  gaGroupId: string;
  name: string;
  inviteLink: string;
  memberCount: number; // כמה בעלי זכויות משויכים אליה במערכת
  createdAt: string;
}

export interface TemplateDTO {
  id: string;
  name: string;
  body: string;
  order: number;
}

export const GROUP_STATUS_LABELS: Record<GroupStatus, string> = {
  none: "לא בקבוצה",
  added: "בקבוצה",
  invited: "הוזמן",
  left: "עזב",
  failed: "נכשל",
};

export interface MessageDTO {
  id: string;
  holderId: string;
  direction: "in" | "out";
  body: string;
  type: string;
  mediaUrl: string | null;
  status: string;
  greenApiId: string | null;
  errorText: string | null;
  timestamp: string;
}

/** שדות מובנים (לא דינמיים) על בעל זכויות */
export const BUILTIN_KEYS = [
  "name",
  "relativeValue",
  "state",
  "balancePay",
  "balanceReceive",
  "phone",
  "status",
  "notes",
] as const;

export type BuiltinKey = (typeof BUILTIN_KEYS)[number];

export const STATUS_LABELS: Record<HolderStatus, string> = {
  pending: "ממתין",
  signed: "חתם",
  objected: "התנגד",
};

export const DEFAULT_COLUMNS: Omit<ColumnDefDTO, "id">[] = [
  { key: "name", label: "בעל הזכויות", type: "text", order: 0, visible: true, isCustom: false, options: [] },
  { key: "relativeValue", label: "שווי יחסי", type: "number", order: 1, visible: true, isCustom: false, options: [] },
  { key: "state", label: "מצב", type: "text", order: 2, visible: true, isCustom: false, options: [] },
  { key: "balancePay", label: "תשלומי איזון — משלם", type: "number", order: 3, visible: true, isCustom: false, options: [] },
  { key: "balanceReceive", label: "תשלומי איזון — מקבל", type: "number", order: 4, visible: true, isCustom: false, options: [] },
  { key: "phone", label: "טלפון", type: "phone", order: 5, visible: true, isCustom: false, options: [] },
  { key: "status", label: "סטטוס", type: "status", order: 6, visible: true, isCustom: false, options: [] },
  { key: "notes", label: "הערות", type: "text", order: 7, visible: true, isCustom: false, options: [] },
];
