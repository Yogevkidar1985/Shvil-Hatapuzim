import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "rh_session";

// אימות טוקן הסשן ב-Edge runtime באמצעות Web Crypto (HMAC-SHA256).
// חייב להיות תואם לחתימה שב-app/lib/auth.ts (Node runtime).
async function verifyEdge(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sigHex = token.slice(idx + 1);
  const secret = process.env.SESSION_SECRET || "insecure-dev-secret-change-me";

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const expected = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // השוואה בזמן קבוע
    if (expected.length !== sigHex.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ sigHex.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/whatsapp/webhook"); // וובהוק מאומת בנפרד דרך טוקן

  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authed = await verifyEdge(token);

  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
