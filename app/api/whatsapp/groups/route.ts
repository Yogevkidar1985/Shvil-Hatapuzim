import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { serializeGroup } from "@/app/lib/serialize";
import { getGreenApiConfig, createGroup, getGroupData, GreenApiError } from "@/app/lib/greenapi";
import { normalizeIsraeliPhone } from "@/app/lib/phone";

export const dynamic = "force-dynamic";

// GET /api/whatsapp/groups — רשימת הקבוצות + כמה בעלי זכויות משויכים לכל אחת
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const [groups, counts] = await Promise.all([
    prisma.whatsappGroup.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.rightsHolder.groupBy({
      by: ["groupId"],
      where: { groupId: { not: null }, groupStatus: { in: ["added", "invited"] } },
      _count: { _all: true },
    }),
  ]);
  const countMap = new Map(counts.map((c) => [c.groupId as string, c._count._all]));
  return NextResponse.json({
    groups: groups.map((g) => serializeGroup(g, countMap.get(g.gaGroupId) ?? 0)),
  });
}

export interface GroupMemberResult {
  holderId: string;
  name: string;
  result: "added" | "invite_needed" | "invited" | "failed" | "skipped";
  error?: string;
}

// POST /api/whatsapp/groups — יצירת קבוצה חדשה עם הנבחרים (קריאה מהירה אחת).
// WhatsApp מצרף ישירות את מי שההגדרות שלו מאפשרות; השאר מסומנים invite_needed
// והלקוח שולח להם קישורי הזמנה אחד-אחד (עם השהיה) דרך /groups/invite.
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const holderIds: string[] = Array.isArray(body?.holderIds) ? body.holderIds.map(String) : [];

  if (!name) return NextResponse.json({ error: "חובה להזין שם קבוצה" }, { status: 400 });
  if (holderIds.length === 0) {
    return NextResponse.json({ error: "לא נבחרו אנשים לקבוצה" }, { status: 400 });
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

  const holders = await prisma.rightsHolder.findMany({ where: { id: { in: holderIds } } });
  const withPhone = holders
    .map((h) => ({ holder: h, norm: normalizeIsraeliPhone(h.phone) }))
    .filter((x) => x.norm !== null);

  if (withPhone.length === 0) {
    return NextResponse.json({ error: "לאף אחד מהנבחרים אין מספר טלפון תקין" }, { status: 400 });
  }

  let created;
  try {
    created = await createGroup(cfg, name, withPhone.map((x) => x.norm!.chatId));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof GreenApiError ? e.message : "יצירת הקבוצה נכשלה" },
      { status: 502 }
    );
  }

  const group = await prisma.whatsappGroup.create({
    data: {
      gaGroupId: created.chatId,
      name,
      inviteLink: created.groupInviteLink ?? "",
    },
  });

  // מי באמת צורף (הגדרות פרטיות של WhatsApp עשויות לחסום צירוף ישיר)
  let inGroup: Set<string> | null = null;
  try {
    const data = await getGroupData(cfg, created.chatId);
    inGroup = new Set((data.participants ?? []).map((p) => p.id));
  } catch {
    inGroup = null; // לא ידוע — נניח שכולם צורפו, סנכרון מאוחר יתקן
  }

  const results: GroupMemberResult[] = [];
  const now = new Date();

  for (const { holder, norm } of withPhone) {
    const joined = inGroup === null || inGroup.has(norm!.chatId);
    if (joined) {
      await prisma.rightsHolder.update({
        where: { id: holder.id },
        data: { groupId: created.chatId, groupStatus: "added", groupAddedAt: now },
      });
      results.push({ holderId: holder.id, name: holder.name, result: "added" });
    } else {
      results.push({ holderId: holder.id, name: holder.name, result: "invite_needed" });
    }
  }
  for (const h of holders) {
    if (!withPhone.some((x) => x.holder.id === h.id)) {
      results.push({ holderId: h.id, name: h.name, result: "skipped", error: "אין טלפון תקין" });
    }
  }

  const memberCount = results.filter((r) => r.result === "added").length;
  return NextResponse.json({ ok: true, group: serializeGroup(group, memberCount), results });
}
