import { describe, it, expect } from "vitest";
import { autoMapHeaders, cellToString, mapRows } from "../import";

describe("autoMapHeaders", () => {
  it("ממפה כותרות מוכרות לשדות נכונים", () => {
    const m = autoMapHeaders(["בעל הזכויות", "שווי יחסי", "מצב", "טלפון"]);
    expect(m["בעל הזכויות"]).toBe("name");
    expect(m["שווי יחסי"]).toBe("relativeValue");
    expect(m["מצב"]).toBe("state");
    expect(m["טלפון"]).toBe("phone");
  });

  it("מתעלם מכותרת לא מוכרת (מחרוזת ריקה)", () => {
    const m = autoMapHeaders(["עמודה לא ידועה"]);
    expect(m["עמודה לא ידועה"]).toBe("");
  });
});

describe("cellToString", () => {
  it("שומר דיוק עשרוני מלא ללא עיגול", () => {
    expect(cellToString(0.125)).toBe("0.125");
  });
  it("מחזיר מחרוזת ריקה ל-null/undefined", () => {
    expect(cellToString(null)).toBe("");
    expect(cellToString(undefined)).toBe("");
  });
});

describe("mapRows", () => {
  it("ממפה שורות לשדות מובנים", () => {
    const rows = [{ "בעל הזכויות": "דוד לוי", "שווי יחסי": 0.2 }];
    const mapping = { "בעל הזכויות": "name", "שווי יחסי": "relativeValue" };
    const out = mapRows(rows, mapping);
    expect(out[0].name).toBe("דוד לוי");
    expect(out[0].relativeValue).toBe("0.2");
    expect(out[0].status).toBe("pending");
  });

  it("שומר עמודות לא מובנות תחת extra", () => {
    const rows = [{ "גוש": "1234" }];
    const mapping = { "גוש": "block" };
    const out = mapRows(rows, mapping);
    expect(out[0].extra.block).toBe("1234");
  });
});
