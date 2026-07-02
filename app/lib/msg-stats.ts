// חישוב סיכום הודעות לכל בעל זכויות (נשלחו / התקבלו / כשלונות / הודעה אחרונה)
import { prisma } from "./db";
import type { MsgStats } from "./types";
import { EMPTY_MSG_STATS } from "./types";

/** מחזיר מפה holderId → MsgStats בשתי שאילתות בלבד (יעיל גם למאות שורות) */
export async function computeMsgStats(holderId?: string): Promise<Map<string, MsgStats>> {
  const map = new Map<string, MsgStats>();
  const where = holderId ? { holderId } : undefined;

  const grouped = await prisma.message.groupBy({
    by: ["holderId", "direction", "status"],
    where,
    _count: { _all: true },
  });

  for (const g of grouped) {
    const stats = map.get(g.holderId) ?? { ...EMPTY_MSG_STATS };
    const count = g._count._all;
    if (g.direction === "in") {
      stats.in += count;
    } else if (g.status === "failed") {
      stats.failed += count;
    } else {
      stats.out += count;
    }
    map.set(g.holderId, stats);
  }

  // ההודעה האחרונה לכל בעל זכויות — distinct לפי holderId בסדר יורד
  const lastMsgs = await prisma.message.findMany({
    where,
    orderBy: { timestamp: "desc" },
    distinct: ["holderId"],
    select: { holderId: true, body: true, direction: true, timestamp: true },
  });

  for (const m of lastMsgs) {
    const stats = map.get(m.holderId) ?? { ...EMPTY_MSG_STATS };
    stats.lastBody = m.body;
    stats.lastDirection = m.direction === "in" ? "in" : "out";
    stats.lastAt = m.timestamp.toISOString();
    map.set(m.holderId, stats);
  }

  return map;
}
