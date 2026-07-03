import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { getGreenApiConfig, sendRawMessage, GreenApiError } from "@/app/lib/greenapi";
import { normalizeIsraeliPhone } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/groups/invite — שליחת קישור הזמנה לקבוצה בהודעה פרטית (בודד; הלקוח מנהל קצב).
// גוף: { groupId: <db id>, holderId }
// ההזמנה מתועדת בהיסטוריית ההודעות של האיש → נראה בדיוק מה הוא קיבל ומתי.
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const groupDbId = String(body?.groupId ?? "");
  const holderId = String(body?.holderId ?? "");

  const [group, holder] = await Promise.all([
    prisma.whatsappGroup.findUnique({ where: { id: groupDbId } }),
    prisma.rightsHolder.findUnique({ where: { id: holderId } }),
  ]);
  if (!group) return NextResponse.json({ error: "הקבוצה לא נמצאה" }, { status: 404 });
  if (!holder) return NextResponse.json({ error: "בעל הזכויות לא נמצא" }, { status: 404 });
  if (!group.inviteLink) {
    return NextResponse.json({ result: "failed", error: "לקבוצה אין קישור הזמנה" }, { status: 400 });
  }

  const norm = normalizeIsraeliPhone(holder.phone);
  if (!norm) return NextResponse.json({ result: "skipped", error: "אין טלפון תקין" });

  let cfg;
  try {
    cfg = await getGreenApiConfig();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof GreenApiError ? e.message : "GreenAPI לא מוגדר" },
      { status: 503 }
    );
  }

  const inviteMsg = `שלום ${holder.name}, נשמח לצרף אותך לקבוצת העדכונים "${group.name}". להצטרפות: ${group.inviteLink}`;

  try {
    const sent = await sendRawMessage(cfg, norm.chatId, inviteMsg);
    const now = new Date();
    await prisma.message.create({
      data: {
        holderId: holder.id,
        direction: "out",
        body: inviteMsg,
        type: "invite",
        status: "sent",
        greenApiId: sent.idMessage,
        timestamp: now,
      },
    });
    await prisma.rightsHolder.update({
      where: { id: holder.id },
      data: { groupId: group.gaGroupId, groupStatus: "invited", lastMessageAt: now },
    });
    return NextResponse.json({ result: "invited" });
  } catch (e) {
    await prisma.rightsHolder.update({
      where: { id: holder.id },
      data: { groupId: group.gaGroupId, groupStatus: "failed" },
    });
    return NextResponse.json(
      { result: "failed", error: e instanceof Error ? e.message : "שליחת ההזמנה נכשלה" },
      { status: 502 }
    );
  }
}
