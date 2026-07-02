import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { mapRows, type ColumnMapping, type ImportRow } from "@/app/lib/import";
import { serializeHolder } from "@/app/lib/serialize";

export const dynamic = "force-dynamic";

// POST /api/import — קליטת שורות שכבר נקראו בצד לקוח (SheetJS) + מיפוי, ושמירה ל-DB.
// גוף: { rows: Record<string,unknown>[], mapping: ColumnMapping, replace?: boolean }
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  const mapping = (body?.mapping ?? {}) as ColumnMapping;
  const replace = Boolean(body?.replace);

  if (rows.length === 0) {
    return NextResponse.json({ error: "אין שורות לייבוא" }, { status: 400 });
  }

  const mapped: ImportRow[] = mapRows(rows, mapping);

  // יצירת עמודות דינמיות שזוהו במיפוי אך אינן קיימות
  const customTargets = new Set<string>();
  for (const target of Object.values(mapping)) {
    if (target && !["name", "relativeValue", "state", "balancePay", "balanceReceive", "phone", "status", "notes"].includes(target)) {
      customTargets.add(target);
    }
  }
  if (customTargets.size > 0) {
    const existing = await prisma.columnDef.findMany();
    const existingKeys = new Set(existing.map((c) => c.key));
    let order = existing.reduce((m, c) => Math.max(m, c.order), 0);
    for (const key of customTargets) {
      if (!existingKeys.has(key)) {
        order++;
        await prisma.columnDef.create({
          data: { key, label: key, type: "text", order, visible: true, isCustom: true, options: "[]" },
        });
      }
    }
  }

  if (replace) {
    await prisma.rightsHolder.deleteMany({});
  }

  const startOrder =
    (await prisma.rightsHolder.aggregate({ _max: { rowOrder: true } }))._max.rowOrder ?? 0;

  const created = await prisma.$transaction(
    mapped.map((r, idx) =>
      prisma.rightsHolder.create({
        data: {
          name: r.name,
          relativeValue: r.relativeValue,
          state: r.state,
          balancePay: r.balancePay,
          balanceReceive: r.balanceReceive,
          phone: r.phone,
          status: ["pending", "signed", "objected"].includes(r.status) ? r.status : "pending",
          notes: r.notes,
          extra: JSON.stringify(r.extra ?? {}),
          rowOrder: startOrder + idx + 1,
        },
      })
    )
  );

  return NextResponse.json({ ok: true, count: created.length, holders: created.map((h) => serializeHolder(h)) });
}
