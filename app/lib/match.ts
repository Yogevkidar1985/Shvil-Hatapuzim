// לוגיקת התאמה (VLOOKUP) בין בעלי זכויות לטבלת חתומים — כולל טיפול בהבדלי רווחים/ניקוד והתאמה מעורפלת.

/** נרמול מחרוזת עברית להשוואה: הסרת ניקוד, רווחים כפולים, גרשיים, וקיצוץ */
export function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "") // ניקוד עברי
    .replace(/["'`׳״.]/g, "") // גרשיים ונקודות
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** מרחק לוונשטיין בין שתי מחרוזות */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** ציון דמיון 0..1 (1 = זהה) על בסיס מרחק לוונשטיין מנורמל */
export function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

export type MatchConfidence = "exact" | "fuzzy" | "none";

export interface MatchResult {
  /** האינדקס ברשימת היעד שהותאם, או -1 */
  targetIndex: number;
  score: number;
  confidence: MatchConfidence;
}

/**
 * מוצא את ההתאמה הטובה ביותר לשם נתון מתוך רשימת שמות יעד.
 * exact: התאמה מלאה אחרי נרמול. fuzzy: ציון מעל הסף (ברירת מחדל 0.82). none: אחרת.
 */
export function bestMatch(
  name: string,
  targets: string[],
  fuzzyThreshold = 0.82
): MatchResult {
  const norm = normalizeName(name);
  let best: MatchResult = { targetIndex: -1, score: 0, confidence: "none" };

  for (let i = 0; i < targets.length; i++) {
    const t = normalizeName(targets[i]);
    if (norm && t && norm === t) {
      return { targetIndex: i, score: 1, confidence: "exact" };
    }
    const score = similarity(name, targets[i]);
    if (score > best.score) {
      best = {
        targetIndex: i,
        score,
        confidence: score >= fuzzyThreshold ? "fuzzy" : "none",
      };
    }
  }
  return best;
}
