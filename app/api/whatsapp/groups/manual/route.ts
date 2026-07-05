import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { serializeGroup } from "@/app/lib/serialize";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/groups/manual — יצירת/עדכון קבוצה ידנית (בלי GreenAPI).
// המשתמש יוצר קבוצת WhatsApp בעצמו, מדביק כאן שם + קישור הזמנה, והמערכת שומרת
// ומאפשרת לשלוח את ההזמנה לכל אחד דרך wa.me תוך תיעוד מי הוזמן.
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const inviteLink = String(body?.inviteLink ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "חסר שם קבוצה" }, { status: 400 });
  }
  // אימות בסיסי של קישור הזמנה לקבוצת WhatsApp (chat.whatsapp.com/XXXX)
  if (inviteLink && !/chat\.whatsapp\.com\//i.test(inviteLink)) {
    return NextResponse.json(
      { error: "קישור ההזמנה אינו תקין — הוא אמור להתחיל ב-https://chat.whatsapp.com/" },
      { status: 400 }
    );
  }

  // מזהה ייעודי לקבוצה ידנית (אין gaGroupId אמיתי מ-GreenAPI)
  const gaGroupId = `manual-${randomUUID()}`;
  const group = await prisma.whatsappGroup.create({
    data: { gaGroupId, name, inviteLink },
  });
  return NextResponse.json({ ok: true, group: serializeGroup(group, 0) }, { status: 201 });
}
