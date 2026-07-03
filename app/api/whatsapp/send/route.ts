import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { getGreenApiConfig, sendTextMessage, GreenApiError } from "@/app/lib/greenapi";
import { serializeMessage } from "@/app/lib/serialize";
import { isValidIsraeliPhone } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/send — שליחת הודעה פרטנית לבעל זכויות + שמירת היסטוריה
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const holderId = String(body?.holderId ?? "");
  const message = String(body?.message ?? "").trim();

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

  let cfg;
  try {
    cfg = await getGreenApiConfig();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof GreenApiError ? e.message : "GreenAPI לא מוגדר" },
      { status: 503 }
    );
  }

  try {
    const result = await sendTextMessage(cfg, holder.phone, message);
    const now = new Date();
    const saved = await prisma.message.create({
      data: {
        holderId,
        direction: "out",
        body: message,
        type: "text",
        status: "sent",
        greenApiId: result.idMessage,
        timestamp: now,
      },
    });
    await prisma.rightsHolder.update({
      where: { id: holderId },
      data: { lastMessageAt: now },
    });
    return NextResponse.json({ ok: true, message: serializeMessage(saved) });
  } catch (e) {
    const errMsg = e instanceof GreenApiError ? e.message : "שליחה נכשלה";
    // שמירת ההודעה הכושלת בהיסטוריה לצורך תיעוד
    const saved = await prisma.message.create({
      data: {
        holderId,
        direction: "out",
        body: message,
        type: "text",
        status: "failed",
        errorText: errMsg,
        timestamp: new Date(),
      },
    });
    return NextResponse.json(
      { ok: false, error: errMsg, message: serializeMessage(saved) },
      { status: 502 }
    );
  }
}
