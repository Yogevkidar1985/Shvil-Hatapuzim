import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { serializeHolder } from "@/app/lib/serialize";
import { computeMsgStats } from "@/app/lib/msg-stats";
import { BUILTIN_KEYS } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const BUILTIN = new Set<string>(BUILTIN_KEYS);

// PATCH /api/holders/[id] — עדכון שדות (כולל עמודות דינמיות ב-extra)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  const existing = await prisma.rightsHolder.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  // שדות מובנים
  for (const key of Object.keys(body)) {
    if (BUILTIN.has(key)) {
      if (key === "status") {
        const v = String(body[key]);
        updates.status = ["pending", "signed", "objected"].includes(v) ? v : "pending";
      } else {
        updates[key] = String(body[key] ?? "");
      }
    }
  }

  // עדכון עמודות דינמיות (extra)
  if (body.extra && typeof body.extra === "object") {
    let extra: Record<string, string> = {};
    try {
      extra = JSON.parse(existing.extra);
    } catch {
      extra = {};
    }
    for (const [k, v] of Object.entries(body.extra as Record<string, unknown>)) {
      extra[k] = String(v ?? "");
    }
    updates.extra = JSON.stringify(extra);
  }

  const holder = await prisma.rightsHolder.update({
    where: { id: params.id },
    data: updates,
  });
  const statsMap = await computeMsgStats(holder.id);
  return NextResponse.json({ holder: serializeHolder(holder, statsMap.get(holder.id)) });
}

// DELETE /api/holders/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  await prisma.rightsHolder.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
