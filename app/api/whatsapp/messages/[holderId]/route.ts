import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { isAuthenticated } from "@/app/lib/auth";
import { serializeMessage } from "@/app/lib/serialize";

export const dynamic = "force-dynamic";

// GET /api/whatsapp/messages/[holderId] — היסטוריית שיחה מלאה (נכנס + יוצא)
export async function GET(_req: NextRequest, { params }: { params: { holderId: string } }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  const messages = await prisma.message.findMany({
    where: { holderId: params.holderId },
    orderBy: { timestamp: "asc" },
  });
  return NextResponse.json({ messages: messages.map(serializeMessage) });
}
