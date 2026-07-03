import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { ensureDefaultTemplates } from "@/app/lib/bootstrap";
import type { TemplateDTO } from "@/app/lib/types";

export const dynamic = "force-dynamic";

function toDTO(t: { id: string; name: string; body: string; order: number }): TemplateDTO {
  return { id: t.id, name: t.name, body: t.body, order: t.order };
}

// GET /api/templates — כל תבניות ההודעה
export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  await ensureDefaultTemplates();
  const templates = await prisma.messageTemplate.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ templates: templates.map(toDTO) });
}

// POST /api/templates — יצירת תבנית חדשה
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const text = String(body?.body ?? "").trim();
  if (!name || !text) return NextResponse.json({ error: "חובה שם ותוכן לתבנית" }, { status: 400 });
  const max = await prisma.messageTemplate.aggregate({ _max: { order: true } });
  const tpl = await prisma.messageTemplate.create({
    data: { name, body: text, order: (max._max.order ?? 0) + 1 },
  });
  return NextResponse.json({ template: toDTO(tpl) }, { status: 201 });
}
