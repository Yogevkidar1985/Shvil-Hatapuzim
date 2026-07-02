import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { serializeHolder } from "@/app/lib/serialize";
import { computeMsgStats } from "@/app/lib/msg-stats";

export const dynamic = "force-dynamic";

// GET /api/holders — כל בעלי הזכויות + סיכום הודעות לכל אחד (להצגת היסטוריה ומניעת כפילויות)
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const [holders, statsMap] = await Promise.all([
    prisma.rightsHolder.findMany({
      orderBy: [{ rowOrder: "asc" }, { createdAt: "asc" }],
    }),
    computeMsgStats(),
  ]);
  return NextResponse.json({
    holders: holders.map((h) => serializeHolder(h, statsMap.get(h.id))),
  });
}

// POST /api/holders — יצירת שורה חדשה
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const max = await prisma.rightsHolder.aggregate({ _max: { rowOrder: true } });
  const holder = await prisma.rightsHolder.create({
    data: {
      name: String(body?.name ?? ""),
      phone: String(body?.phone ?? ""),
      rowOrder: (max._max.rowOrder ?? 0) + 1,
      extra: "{}",
    },
  });
  return NextResponse.json({ holder: serializeHolder(holder) }, { status: 201 });
}
