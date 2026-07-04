import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { serializeHolder } from "@/app/lib/serialize";
import { computeMsgStats } from "@/app/lib/msg-stats";
import { ensureDefaultColumns, ensureInitialHolders } from "@/app/lib/bootstrap";

export const dynamic = "force-dynamic";

// GET /api/holders — כל בעלי הזכויות + סיכום הודעות לכל אחד (להצגת היסטוריה ומניעת כפילויות)
// בכניסה הראשונה (טבלה ריקה) — טוען אוטומטית את כל 116 אנשי הקשר של גוש 6446.
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  await ensureDefaultColumns();
  await ensureInitialHolders();
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
  const phone = String(body?.phone ?? "").trim();
  const holder = await prisma.rightsHolder.create({
    data: {
      name: String(body?.name ?? ""),
      phone,
      phoneAddedAt: phone ? new Date() : null,
      rowOrder: (max._max.rowOrder ?? 0) + 1,
      extra: "{}",
    },
  });
  return NextResponse.json({ holder: serializeHolder(holder) }, { status: 201 });
}
