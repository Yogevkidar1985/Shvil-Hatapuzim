import { describe, it, expect } from "vitest";
import { normalizeName, similarity, bestMatch } from "../match";

describe("normalizeName", () => {
  it("מסיר רווחים כפולים וגרשיים", () => {
    expect(normalizeName("ישראל   ישראלי")).toBe("ישראל ישראלי");
    expect(normalizeName('דוד לוי"')).toBe("דוד לוי");
  });
});

describe("similarity", () => {
  it("מחזיר 1 לשמות זהים", () => {
    expect(similarity("ישראל ישראלי", "ישראל ישראלי")).toBe(1);
  });
  it("מחזיר 1 כשרק רווחים שונים", () => {
    expect(similarity("ישראל  ישראלי", "ישראל ישראלי")).toBe(1);
  });
  it("מחזיר ערך גבוה לשמות דומים", () => {
    expect(similarity("שרה כהן", "שרה כהנא")).toBeGreaterThan(0.7);
  });
});

describe("bestMatch", () => {
  const targets = ["ישראל ישראלי", "שרה כהן", "דוד לוי"];

  it("מוצא התאמה מדויקת", () => {
    const r = bestMatch("ישראל ישראלי", targets);
    expect(r.confidence).toBe("exact");
    expect(r.targetIndex).toBe(0);
  });

  it("מוצא התאמה מדויקת למרות רווחים", () => {
    const r = bestMatch("דוד   לוי ", targets);
    expect(r.confidence).toBe("exact");
    expect(r.targetIndex).toBe(2);
  });

  it("מסמן fuzzy לשם דומה אך לא זהה (הבדל תו בודד)", () => {
    // "דוד לוין" מול "דוד לוי" — מרחק 1, ציון ~0.86 → מעל הסף 0.82
    const r = bestMatch("דוד לוין", targets);
    expect(r.targetIndex).toBe(2);
    expect(r.confidence).toBe("fuzzy");
  });

  it("שם דומה מתחת לסף מסומן none (דורש אישור ידני)", () => {
    const r = bestMatch("שרה כהנא", targets);
    expect(r.targetIndex).toBe(1);
    expect(r.confidence).toBe("none");
  });

  it("מסמן none לשם שונה לחלוטין", () => {
    const r = bestMatch("משה פרץ", targets);
    expect(r.confidence).toBe("none");
  });
});
