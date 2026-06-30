// המרת רשומות Prisma ל-DTO לצד לקוח
import type { HolderDTO, MessageDTO, ColumnDefDTO, HolderStatus, ColumnType } from "./types";

// טיפוסים גמישים לרשומות Prisma (נמנעים מתלות בייבוא טיפוסי @prisma/client לפני generate)
type HolderRecord = {
  id: string; name: string; relativeValue: string; state: string;
  balancePay: string; balanceReceive: string; phone: string; status: string;
  notes: string; extra: string; rowOrder: number;
  lastMessageAt: Date | null; createdAt: Date; updatedAt: Date;
};

type MessageRecord = {
  id: string; holderId: string; direction: string; body: string; type: string;
  mediaUrl: string | null; status: string; greenApiId: string | null;
  errorText: string | null; timestamp: Date;
};

type ColumnRecord = {
  id: string; key: string; label: string; type: string; order: number;
  visible: boolean; isCustom: boolean; options: string;
};

function parseJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function serializeHolder(h: HolderRecord): HolderDTO {
  return {
    id: h.id,
    name: h.name,
    relativeValue: h.relativeValue,
    state: h.state,
    balancePay: h.balancePay,
    balanceReceive: h.balanceReceive,
    phone: h.phone,
    status: (["pending", "signed", "objected"].includes(h.status) ? h.status : "pending") as HolderStatus,
    notes: h.notes,
    extra: parseJson<Record<string, string>>(h.extra, {}),
    rowOrder: h.rowOrder,
    lastMessageAt: h.lastMessageAt ? h.lastMessageAt.toISOString() : null,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
  };
}

export function serializeMessage(m: MessageRecord): MessageDTO {
  return {
    id: m.id,
    holderId: m.holderId,
    direction: m.direction === "in" ? "in" : "out",
    body: m.body,
    type: m.type,
    mediaUrl: m.mediaUrl,
    status: m.status,
    greenApiId: m.greenApiId,
    errorText: m.errorText,
    timestamp: m.timestamp.toISOString(),
  };
}

export function serializeColumn(c: ColumnRecord): ColumnDefDTO {
  return {
    id: c.id,
    key: c.key,
    label: c.label,
    type: c.type as ColumnType,
    order: c.order,
    visible: c.visible,
    isCustom: c.isCustom,
    options: parseJson<string[]>(c.options, []),
  };
}
