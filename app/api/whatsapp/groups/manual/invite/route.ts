import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/groups/manual/invite — תיעוד שהזמנה לקבוצה נשלחה ידנית (wa.me).
// מסמן את בעל הזכויות כ"הוזמן" ומשייך אותו לקבוצה — בלי GreenAPI.
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const holderId = String(body?.holderId ?? "");
  const gaGroupId = String(body?.gaGroupId ?? "");

  if (!holderId || !gaGroupId) {
    return NextResponse.json({ error: "חסר מזהה נמען או קבוצה" }, { status: 400 });
  }

  const holder = await prisma.rightsHolder.findUnique({ where: { id: holderId } });
  if (!holder) {
    return NextResponse.json({ error: "בעל הזכויות לא נמצא" }, { status: 404 });
  }

  await prisma.rightsHolder.update({
    where: { id: holderId },
    data: { groupId: gaGroupId, groupStatus: "invited", groupAddedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
