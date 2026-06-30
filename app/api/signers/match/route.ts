import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { bestMatch } from "@/app/lib/match";

export const dynamic = "force-dynamic";

// POST /api/signers/match — שלב 2: השוואת VLOOKUP מול רשימת חתומים.
// גוף: { signerNames: string[], apply?: {holderId, status}[] }
// מצב ברירת מחדל: מחזיר הצעות התאמה (לא משנה DB). עם apply: מסמן סטטוס לפי אישור המשתמש.
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));

  // מצב יישום: עדכון סטטוסים שאושרו ידנית
  if (Array.isArray(body?.apply)) {
    const apply = body.apply as { holderId: string; status: string }[];
    await prisma.$transaction(
      apply
        .filter((a) => a.holderId && ["pending", "signed", "objected"].includes(a.status))
        .map((a) =>
          prisma.rightsHolder.update({
            where: { id: a.holderId },
            data: { status: a.status },
          })
        )
    );
    return NextResponse.json({ ok: true, applied: apply.length });
  }

  // מצב הצעות: התאמת שמות חתומים מול בעלי הזכויות
  const signerNames: string[] = Array.isArray(body?.signerNames)
    ? body.signerNames.map(String).filter(Boolean)
    : [];
  if (signerNames.length === 0) {
    return NextResponse.json({ error: "לא התקבלה רשימת חתומים" }, { status: 400 });
  }

  const holders = await prisma.rightsHolder.findMany();
  const holderNames = holders.map((h) => h.name);

  const suggestions = signerNames.map((signer) => {
    const m = bestMatch(signer, holderNames);
    const holder = m.targetIndex >= 0 ? holders[m.targetIndex] : null;
    return {
      signerName: signer,
      holderId: holder?.id ?? null,
      holderName: holder?.name ?? null,
      currentStatus: holder?.status ?? null,
      score: Number(m.score.toFixed(3)),
      confidence: m.confidence, // exact | fuzzy | none
      // התאמות exact מסומנות אוטומטית; fuzzy דורשות אישור ידני
      autoApprove: m.confidence === "exact",
    };
  });

  return NextResponse.json({ suggestions });
}
