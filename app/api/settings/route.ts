import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/app/lib/auth";
import { getAllConfig, setConfig, CONFIG_KEYS } from "@/app/lib/settings";
import { getGreenApiConfig, getStateInstance, GreenApiError } from "@/app/lib/greenapi";

export const dynamic = "force-dynamic";

function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "••••";
  return token.slice(0, 4) + "…" + token.slice(-4);
}

// GET /api/settings — מחזיר הגדרות (הטוקן מוסתר) + מצב הענן
export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  const cfg = await getAllConfig();
  const idInstance = cfg[CONFIG_KEYS.greenIdInstance] || process.env.GREENAPI_ID_INSTANCE || "";
  const apiToken = cfg[CONFIG_KEYS.greenApiToken] || process.env.GREENAPI_API_TOKEN || "";
  return NextResponse.json({
    // כל הנתונים נשמרים במסד ענני (Postgres/Supabase) — לא מקומית
    cloud: { connected: true, provider: "PostgreSQL (Supabase)" },
    greenApi: {
      idInstance,
      apiTokenMasked: maskToken(apiToken),
      hasToken: Boolean(apiToken),
      apiUrl: cfg[CONFIG_KEYS.greenApiUrl] || process.env.GREENAPI_API_URL || "https://api.green-api.com",
      source: cfg[CONFIG_KEYS.greenIdInstance] ? "cloud" : process.env.GREENAPI_ID_INSTANCE ? "env" : "none",
    },
  });
}

// POST /api/settings — שמירת מפתחות GreenAPI בענן + בדיקת חיבור
// גוף: { idInstance, apiToken (ריק/מוסתר = לא לשנות), apiUrl?, test? }
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const idInstance = String(body?.idInstance ?? "").trim();
  const apiToken = String(body?.apiToken ?? "").trim();
  const apiUrl = String(body?.apiUrl ?? "").trim();

  if (idInstance) await setConfig(CONFIG_KEYS.greenIdInstance, idInstance);
  // טוקן: מעדכנים רק אם נשלח ערך חדש שאינו הערך המוסתר
  if (apiToken && !apiToken.includes("…") && !apiToken.includes("•")) {
    await setConfig(CONFIG_KEYS.greenApiToken, apiToken);
  }
  if (apiUrl) await setConfig(CONFIG_KEYS.greenApiUrl, apiUrl);

  // בדיקת חיבור אם התבקש
  if (body?.test) {
    try {
      const cfg = await getGreenApiConfig();
      const state = await getStateInstance(cfg);
      return NextResponse.json({ ok: true, tested: true, state: state.stateInstance });
    } catch (e) {
      return NextResponse.json({
        ok: true,
        tested: true,
        state: "error",
        error: e instanceof GreenApiError ? e.message : "בדיקת החיבור נכשלה",
      });
    }
  }
  return NextResponse.json({ ok: true });
}
