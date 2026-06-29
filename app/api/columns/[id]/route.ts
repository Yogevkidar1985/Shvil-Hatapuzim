import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { serializeColumn } from "@/app/lib/serialize";

export const dynamic = "force-dynamic";

// PATCH /api/columns/[id] — עדכון עמודה בודדת
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.label === "string") data.label = body.label;
  if (typeof body.visible === "boolean") data.visible = body.visible;
  if (typeof body.order === "number") data.order = body.order;
  if (Array.isArray(body.options)) data.options = JSON.stringify(body.options.map(String));

  const col = await prisma.columnDef.update({ where: { id: params.id }, data });
  return NextResponse.json({ column: serializeColumn(col) });
}

// DELETE /api/columns/[id] — מחיקת עמודה דינמית בלבד (עמודות מובנות מוגנות)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const col = await prisma.columnDef.findUnique({ where: { id: params.id } });
  if (!col) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  if (!col.isCustom) {
    return NextResponse.json({ error: "לא ניתן למחוק עמודה מובנית" }, { status: 400 });
  }
  await prisma.columnDef.delete({ where: { id: params.id } });
  // ניקוי הערכים מ-extra בכל השורות
  const holders = await prisma.rightsHolder.findMany();
  await prisma.$transaction(
    holders.map((h) => {
      let extra: Record<string, string> = {};
      try {
        extra = JSON.parse(h.extra);
      } catch {
        extra = {};
      }
      delete extra[col.key];
      return prisma.rightsHolder.update({
        where: { id: h.id },
        data: { extra: JSON.stringify(extra) },
      });
    })
  );
  return NextResponse.json({ ok: true });
}
