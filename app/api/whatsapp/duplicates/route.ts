import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { serializeHolder } from "@/app/lib/serialize";
import { renderTemplate } from "@/app/lib/template";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/duplicates — בדיקת כפילויות לפני שליחה מרובה.
// גוף: { holderIds: string[], template: string }
// מחזיר לכל נמען: כמה הודעות כבר נשלחו אליו, והאם התוכן המדויק הזה כבר נשלח לו בעבר.
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const holderIds: string[] = Array.isArray(body?.holderIds) ? body.holderIds.map(String) : [];
  const template = String(body?.template ?? "");

  if (holderIds.length === 0) {
    return NextResponse.json({ checks: [] });
  }

  const [holders, messages] = await Promise.all([
    prisma.rightsHolder.findMany({ where: { id: { in: holderIds } } }),
    prisma.message.findMany({
      where: { holderId: { in: holderIds }, direction: "out", status: { not: "failed" } },
      select: { holderId: true, body: true },
    }),
  ]);

  const byHolder = new Map<string, string[]>();
  for (const m of messages) {
    const arr = byHolder.get(m.holderId) ?? [];
    arr.push(m.body);
    byHolder.set(m.holderId, arr);
  }

  const norm = (s: string) => s.replace(/\s+/g, " ").trim();

  const checks = holders.map((h) => {
    const rendered = norm(renderTemplate(template, serializeHolder(h)));
    const prior = byHolder.get(h.id) ?? [];
    return {
      holderId: h.id,
      sentCount: prior.length,
      duplicate: rendered.length > 0 && prior.some((b) => norm(b) === rendered),
    };
  });

  return NextResponse.json({ checks });
}
