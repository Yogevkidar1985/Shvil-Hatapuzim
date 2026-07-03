import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import type { TemplateDTO } from "@/app/lib/types";

export const dynamic = "force-dynamic";

function toDTO(t: { id: string; name: string; body: string; order: number }): TemplateDTO {
  return { id: t.id, name: t.name, body: t.body, order: t.order };
}

// PATCH /api/templates/[id] — עדכון תבנית
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthenticated()) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.body === "string") data.body = body.body.trim();
  if (typeof body.order === "number") data.order = body.order;
  const tpl = await prisma.messageTemplate.update({ where: { id: params.id }, data });
  return NextResponse.json({ template: toDTO(tpl) });
}

// DELETE /api/templates/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthenticated()) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  await prisma.messageTemplate.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
