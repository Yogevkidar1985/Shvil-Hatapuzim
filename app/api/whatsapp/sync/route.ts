import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import {
  getGreenApiConfig,
  receiveNotification,
  deleteNotification,
  GreenApiError,
} from "@/app/lib/greenapi";
import { normalizeIsraeliPhone } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/sync — משיכת הודעות נכנסות בשיטת polling (חלופה ל-webhook, נוח לפיתוח).
// מרוקן את תור ההתראות של GreenAPI ושומר הודעות נכנסות מול בעלי הזכויות המתאימים.
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

  let processed = 0;
  let saved = 0;
  const holders = await prisma.rightsHolder.findMany();

  // משוך עד 50 התראות בקריאה אחת (הימנעות מלולאה אינסופית)
  for (let i = 0; i < 50; i++) {
    let note;
    try {
      note = await receiveNotification(cfg);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof GreenApiError ? e.message : "שגיאה במשיכת הודעות", processed, saved },
        { status: 502 }
      );
    }
    if (!note) break; // התור ריק
    processed++;

    const body = note.body;
    if (body?.typeWebhook === "incomingMessageReceived") {
      const chatId = body.senderData?.chatId ?? "";
      const norm = normalizeIsraeliPhone(chatId);
      const md = body.messageData;
      let text = "";
      if (md?.typeMessage === "textMessage") text = md.textMessageData?.textMessage ?? "";
      else if (md?.typeMessage === "extendedTextMessage") text = md.extendedTextMessageData?.text ?? "";
      else text = `[הודעה מסוג ${md?.typeMessage ?? "לא ידוע"}]`;

      const holder = holders.find((h) => {
        const hn = normalizeIsraeliPhone(h.phone);
        return hn && norm && hn.msisdn === norm.msisdn;
      });

      if (holder) {
        const ts = body.timestamp ? new Date(body.timestamp * 1000) : new Date();
        await prisma.message.create({
          data: {
            holderId: holder.id,
            direction: "in",
            body: text,
            type: "text",
            status: "received",
            greenApiId: body.idMessage ?? null,
            timestamp: ts,
          },
        });
        await prisma.rightsHolder.update({
          where: { id: holder.id },
          data: { lastMessageAt: ts },
        });
        saved++;
      }
    }

    await deleteNotification(cfg, note.receiptId).catch(() => null);
  }

  return NextResponse.json({ ok: true, processed, saved });
}
