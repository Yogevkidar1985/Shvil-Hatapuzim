"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "כניסה נכשלה");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "כניסה נכשלה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(1000px 600px at 80% -10%, #ffd9b0 0%, transparent 55%), radial-gradient(800px 500px at 10% 110%, #ffe4c4 0%, transparent 50%), linear-gradient(180deg,#fff7ed,#fef3e2)",
      }}>
      {/* עיטורים */}
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 w-80 h-80 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-3xl shadow-pop p-8 relative animate-pop-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-4xl shadow-brand mb-3">
            🍊
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">שביל התפוזים</h1>
          <p className="text-slate-400 mt-1">מערכת ניהול בעלי זכויות</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">סיסמת כניסה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              dir="ltr"
              className="focus-ring w-full px-4 py-3 border border-slate-200 rounded-xl outline-none text-center tracking-widest"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in">
              <span>⚠️</span> {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gradient-to-b from-brand-500 to-brand-600 hover:to-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-brand transition-all active:translate-y-px flex items-center justify-center gap-2"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "כניסה למערכת"}
          </button>
        </form>
        <p className="text-xs text-slate-400 text-center mt-6 flex items-center justify-center gap-1.5">
          🔒 גישה מאובטחת — נתוני בעלי הזכויות הם מידע אישי מוגן
        </p>
      </div>
    </div>
  );
}
