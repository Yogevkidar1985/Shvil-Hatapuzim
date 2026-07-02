import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { getGreenApiConfig, addGroupParticipant, GreenApiError } from "@/app/lib/greenapi";
import { normalizeIsraeliPhone } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/groups/add — צירוף בעל זכויות בודד לקבוצה קיימת (הלקוח מנהל את הקצב).
// גוף: { groupId: <db id>, holderId }
// מחזיר result: added | invite_needed | skipped
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const groupDbId = String(body?.groupId ?? "");
  const holderId = String(body?.holderId ?? "");

  if (!groupDbId || !holderId) {
    return NextResponse.json({ error: "חסרה קבוצה או בעל זכויות" }, { status: 400 });
  }

  const [group, holder] = await Promise.all([
    prisma.whatsappGroup.findUnique({ where: { id: groupDbId } }),
    prisma.rightsHolder.findUnique({ where: { id: holderId } }),
  ]);
  if (!group) return NextResponse.json({ error: "הקבוצה לא נמצאה" }, { status: 404 });
  if (!holder) return NextResponse.json({ error: "בעל הזכויות לא נמצא" }, { status: 404 });

  const norm = normalizeIsraeliPhone(holder.phone);
  if (!norm) {
    return NextResponse.json({ result: "skipped", error: "אין טלפון תקין" });
  }
  if (holder.groupId === group.gaGroupId && holder.groupStatus === "added") {
    return NextResponse.json({ result: "skipped", error: "כבר בקבוצה" });
  }

  let cfg;
  try {
    cfg = getGreenApiConfig();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof GreenApiError ? e.message : "GreenAPI לא מוגדר" },
      { status: 503 }
    );
  }

  try {
    const added = await addGroupParticipant(cfg, group.gaGroupId, norm.chatId);
    if (added) {
      await prisma.rightsHolder.update({
        where: { id: holder.id },
        data: { groupId: group.gaGroupId, groupStatus: "added", groupAddedAt: new Date() },
      });
      return NextResponse.json({ result: "added" });
    }
    // צירוף ישיר נחסם — הלקוח ישלח קישור הזמנה דרך /groups/invite
    return NextResponse.json({ result: "invite_needed" });
  } catch (e) {
    await prisma.rightsHolder.update({
      where: { id: holder.id },
      data: { groupId: group.gaGroupId, groupStatus: "failed" },
    });
    return NextResponse.json(
      { result: "failed", error: e instanceof Error ? e.message : "שגיאה" },
      { status: 502 }
    );
  }
}
