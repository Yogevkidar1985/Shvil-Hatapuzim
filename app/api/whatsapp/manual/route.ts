import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { serializeMessage } from "@/app/lib/serialize";
import { isValidIsraeliPhone } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/manual — תיעוד הודעה שנשלחה ידנית (דרך wa.me מהווטסאפ של המשתמש).
// המסלול החינמי: אין קריאה ל-GreenAPI — רק שמירת ההיסטוריה כדי שהמעקב "מי קיבל מה" יישמר.
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const holderId = String(body?.holderId ?? "");
  const message = String(body?.message ?? "").trim();
  const templateName = body?.templateName ? String(body.templateName).slice(0, 120) : null;

  if (!holderId || !message) {
    return NextResponse.json({ error: "חסר מזהה נמען או תוכן הודעה" }, { status: 400 });
  }

  const holder = await prisma.rightsHolder.findUnique({ where: { id: holderId } });
  if (!holder) {
    return NextResponse.json({ error: "בעל הזכויות לא נמצא" }, { status: 404 });
  }
  if (!isValidIsraeliPhone(holder.phone)) {
    return NextResponse.json({ error: "מספר הטלפון של בעל הזכויות אינו תקין" }, { status: 400 });
  }

  const now = new Date();
  const saved = await prisma.message.create({
    data: {
      holderId,
      direction: "out",
      body: message,
      templateName,
      type: "text",
      status: "sent",
      timestamp: now,
    },
  });
  await prisma.rightsHolder.update({
    where: { id: holderId },
    data: { lastMessageAt: now },
  });
  return NextResponse.json({ ok: true, message: serializeMessage(saved) });
}
