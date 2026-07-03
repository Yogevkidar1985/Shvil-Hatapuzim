import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { getGreenApiConfig, checkWhatsapp, GreenApiError } from "@/app/lib/greenapi";

export const dynamic = "force-dynamic";

const MAX_PER_CALL = 5; // מנות קטנות — הלקוח קורא בלולאה עם השהיה (מתאים גם ל-serverless)

// POST /api/whatsapp/check — בדיקת תקינות מספרים (האם קיים חשבון WhatsApp).
// גוף: { holderIds?: string[] } — ללא רשימה: בודק את המספרים הבאים שטרם נבדקו.
// מחזיר remaining כדי שהלקוח ידע אם להמשיך לקרוא.
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const holderIds: string[] = Array.isArray(body?.holderIds) ? body.holderIds.map(String) : [];

  let cfg;
  try {
    cfg = await getGreenApiConfig();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof GreenApiError ? e.message : "GreenAPI לא מוגדר" },
      { status: 503 }
    );
  }

  const where = holderIds.length > 0
    ? { id: { in: holderIds }, phone: { not: "" }, waCheck: "unknown" }
    : { phone: { not: "" }, waCheck: "unknown" };

  const [holders, total] = await Promise.all([
    prisma.rightsHolder.findMany({ where, take: MAX_PER_CALL }),
    prisma.rightsHolder.count({ where }),
  ]);

  let valid = 0;
  let invalid = 0;

  for (const holder of holders) {
    let result: boolean | null = null;
    try {
      result = await checkWhatsapp(cfg, holder.phone);
    } catch {
      continue; // שגיאת רשת — נשאיר unknown לניסיון הבא
    }
    const waCheck = result === true ? "valid" : "invalid";
    await prisma.rightsHolder.update({ where: { id: holder.id }, data: { waCheck } });
    if (result === true) valid++;
    else invalid++;
  }

  return NextResponse.json({
    ok: true,
    checked: holders.length,
    valid,
    invalid,
    remaining: Math.max(0, total - holders.length),
  });
}
