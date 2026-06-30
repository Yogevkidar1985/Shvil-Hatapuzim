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
  createdAt: string;
  updatedAt: string;
}

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
