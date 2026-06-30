import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { serializeColumn } from "@/app/lib/serialize";
import { ensureDefaultColumns } from "@/app/lib/bootstrap";

export const dynamic = "force-dynamic";

// GET /api/columns — הגדרות העמודות
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  await ensureDefaultColumns();
  const columns = await prisma.columnDef.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ columns: columns.map(serializeColumn) });
}

// POST /api/columns — הוספת עמודה דינמית
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const label = String(body?.label ?? "").trim();
  const type = String(body?.type ?? "text");
  if (!label) {
    return NextResponse.json({ error: "חובה להזין שם עמודה" }, { status: 400 });
  }
  if (!["text", "number", "date", "select"].includes(type)) {
    return NextResponse.json({ error: "סוג עמודה לא תקין" }, { status: 400 });
  }

  // יצירת מפתח ייחודי לעמודה הדינמית
  const key = `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const max = await prisma.columnDef.aggregate({ _max: { order: true } });
  const options = Array.isArray(body?.options) ? body.options.map(String) : [];

  const col = await prisma.columnDef.create({
    data: {
      key,
      label,
      type,
      order: (max._max.order ?? 0) + 1,
      visible: true,
      isCustom: true,
      options: JSON.stringify(options),
    },
  });
  return NextResponse.json({ column: serializeColumn(col) }, { status: 201 });
}

// PUT /api/columns — עדכון סדר/נראות של מספר עמודות בבת אחת
export async function PUT(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const updates = Array.isArray(body?.columns) ? body.columns : [];
  await prisma.$transaction(
    updates.map((c: { id: string; order?: number; visible?: boolean; label?: string }) =>
      prisma.columnDef.update({
        where: { id: c.id },
        data: {
          ...(typeof c.order === "number" ? { order: c.order } : {}),
          ...(typeof c.visible === "boolean" ? { visible: c.visible } : {}),
          ...(typeof c.label === "string" ? { label: c.label } : {}),
        },
      })
    )
  );
  const columns = await prisma.columnDef.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ columns: columns.map(serializeColumn) });
}
