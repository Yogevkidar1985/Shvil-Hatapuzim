import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { getGreenApiConfig, getGroupData, GreenApiError } from "@/app/lib/greenapi";
import { normalizeIsraeliPhone } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/groups/sync — סנכרון חברות מול WhatsApp בפועל.
// מי שהוזמן ונכנס → "בקבוצה". מי שהיה בקבוצה ויצא → "עזב". עובד על כל הקבוצות במערכת.
export async function POST() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
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

  const groups = await prisma.whatsappGroup.findMany();
  if (groups.length === 0) {
    return NextResponse.json({ ok: true, joined: 0, left: 0, checkedGroups: 0 });
  }

  const holders = await prisma.rightsHolder.findMany({ where: { phone: { not: "" } } });
  let joined = 0;
  let left = 0;
  let checkedGroups = 0;

  for (const group of groups) {
    let participants: Set<string>;
    try {
      const data = await getGroupData(cfg, group.gaGroupId);
      participants = new Set((data.participants ?? []).map((p) => p.id));
      checkedGroups++;
    } catch {
      continue; // קבוצה לא זמינה — נמשיך לאחרות
    }

    for (const holder of holders) {
      const norm = normalizeIsraeliPhone(holder.phone);
      if (!norm) continue;
      const inGroup = participants.has(norm.chatId);
      const linkedToThisGroup = holder.groupId === group.gaGroupId;

      if (inGroup && (!linkedToThisGroup || holder.groupStatus !== "added")) {
        // נכנס לקבוצה (גם אם הוזמן בלבד, וגם אם הצטרף דרך קישור שהועבר לו)
        await prisma.rightsHolder.update({
          where: { id: holder.id },
          data: { groupId: group.gaGroupId, groupStatus: "added", groupAddedAt: new Date() },
        });
        holder.groupStatus = "added";
        holder.groupId = group.gaGroupId;
        joined++;
      } else if (!inGroup && linkedToThisGroup && holder.groupStatus === "added") {
        // היה בקבוצה ועזב
        await prisma.rightsHolder.update({
          where: { id: holder.id },
          data: { groupStatus: "left" },
        });
        holder.groupStatus = "left";
        left++;
      }
    }
  }

  return NextResponse.json({ ok: true, joined, left, checkedGroups });
}
