import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { normalizeIsraeliPhone, chatIdToLocal } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/webhook — מקבל הודעות נכנסות / עדכוני סטטוס מ-GreenAPI.
// הגדירו ב-GreenAPI: webhookUrl = https://YOUR-DOMAIN/api/whatsapp/webhook
// אופציונלי: webhookUrlToken התואם ל-GREENAPI_WEBHOOK_TOKEN (נשלח בכותרת Authorization).
export async function POST(req: NextRequest) {
  // אימות טוקן וובהוק (אם הוגדר)
  const expectedToken = process.env.GREENAPI_WEBHOOK_TOKEN;
  if (expectedToken) {
    const auth = req.headers.get("authorization") || "";
    const provided = auth.replace(/^Bearer\s+/i, "");
    if (provided !== expectedToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ ok: true }); // מתעלם מגוף לא תקין כדי שלא ינסה שוב
  }

  const type = payload?.typeWebhook;

  try {
    if (type === "incomingMessageReceived") {
      await handleIncoming(payload);
    } else if (type === "outgoingMessageStatus") {
      await handleStatusUpdate(payload);
    }
    // סוגים אחרים (stateInstanceChanged וכו') — מתעלמים בשקט
  } catch (e) {
    console.error("שגיאת עיבוד וובהוק:", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ok: true });
}

async function findHolderByChatId(chatId: string) {
  const local = chatIdToLocal(chatId); // למשל 0501234567
  const norm = normalizeIsraeliPhone(chatId);
  const holders = await prisma.rightsHolder.findMany();
  // התאמה לפי מספר מנורמל
  return (
    holders.find((h) => {
      const hn = normalizeIsraeliPhone(h.phone);
      return hn && norm && hn.msisdn === norm.msisdn;
    }) ??
    holders.find((h) => h.phone.replace(/\D/g, "").endsWith(local.replace(/\D/g, "").slice(-9))) ??
    null
  );
}

async function handleIncoming(payload: any) {
  const chatId: string = payload?.senderData?.chatId ?? "";
  const md = payload?.messageData ?? {};
  let text = "";
  let mediaUrl: string | null = null;
  let msgType = "text";

  if (md.typeMessage === "textMessage") {
    text = md.textMessageData?.textMessage ?? "";
  } else if (md.typeMessage === "extendedTextMessage") {
    text = md.extendedTextMessageData?.text ?? "";
  } else if (md.typeMessage === "imageMessage" || md.typeMessage === "documentMessage" || md.typeMessage === "videoMessage" || md.typeMessage === "audioMessage") {
    const fmd = md.fileMessageData ?? {};
    text = fmd.caption ?? "";
    mediaUrl = fmd.downloadUrl ?? null;
    msgType = md.typeMessage.replace("Message", "");
  } else {
    text = `[הודעה מסוג ${md.typeMessage ?? "לא ידוע"}]`;
  }

  if (!chatId) return;
  const holder = await findHolderByChatId(chatId);
  if (!holder) {
    // הודעה ממספר שאינו במערכת — מתעלמים (אפשר בעתיד ליצור שורה חדשה)
    console.warn("הודעה נכנסת ממספר לא מוכר:", chatId);
    return;
  }

  const ts = payload?.timestamp ? new Date(payload.timestamp * 1000) : new Date();
  await prisma.message.create({
    data: {
      holderId: holder.id,
      direction: "in",
      body: text,
      type: msgType,
      mediaUrl,
      status: "received",
      greenApiId: payload?.idMessage ?? null,
      timestamp: ts,
    },
  });
  await prisma.rightsHolder.update({
    where: { id: holder.id },
    data: { lastMessageAt: ts },
  });
}

async function handleStatusUpdate(payload: any) {
  const idMessage = payload?.idMessage;
  const status = payload?.status; // sent | delivered | read | failed
  if (!idMessage || !status) return;
  await prisma.message.updateMany({
    where: { greenApiId: idMessage },
    data: { status },
  });
}
