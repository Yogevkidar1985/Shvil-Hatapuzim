import { NextResponse } from "next/server";
import { isAuthenticated } from "@/app/lib/auth";
import { isGreenApiConfigured, getGreenApiConfig, getStateInstance } from "@/app/lib/greenapi";

export const dynamic = "force-dynamic";

// GET /api/whatsapp/status — בדיקת תצורת GreenAPI ומצב החיבור (ללא חשיפת סודות)
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  if (!isGreenApiConfigured()) {
    return NextResponse.json({ configured: false, state: null });
  }
  try {
    const cfg = getGreenApiConfig();
    const state = await getStateInstance(cfg);
    return NextResponse.json({ configured: true, state: state.stateInstance });
  } catch {
    return NextResponse.json({ configured: true, state: "unknown" });
  }
}
