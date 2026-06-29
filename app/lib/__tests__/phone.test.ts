import { describe, it, expect } from "vitest";
import { normalizeIsraeliPhone, isValidIsraeliPhone, chatIdToLocal } from "../phone";

describe("normalizeIsraeliPhone", () => {
  it("מנרמל מספר נייד מקומי עם 0 מוביל", () => {
    expect(normalizeIsraeliPhone("0501234567")?.msisdn).toBe("972501234567");
    expect(normalizeIsraeliPhone("0501234567")?.chatId).toBe("972501234567@c.us");
  });

  it("מטפל במספר עם מקפים ורווחים", () => {
    expect(normalizeIsraeliPhone("050-123-4567")?.msisdn).toBe("972501234567");
    expect(normalizeIsraeliPhone(" 052 987 6543 ")?.msisdn).toBe("972529876543");
  });

  it("מטפל במספר שכבר כולל 972", () => {
    expect(normalizeIsraeliPhone("972501234567")?.msisdn).toBe("972501234567");
    expect(normalizeIsraeliPhone("+972501234567")?.msisdn).toBe("972501234567");
    expect(normalizeIsraeliPhone("00972501234567")?.msisdn).toBe("972501234567");
  });

  it("מטפל ב-972 עם 0 מיותר", () => {
    expect(normalizeIsraeliPhone("9720501234567")?.msisdn).toBe("972501234567");
  });

  it("מחזיר null לקלט ריק או לא תקין", () => {
    expect(normalizeIsraeliPhone("")).toBeNull();
    expect(normalizeIsraeliPhone(null)).toBeNull();
    expect(normalizeIsraeliPhone("abc")).toBeNull();
    expect(normalizeIsraeliPhone("123")).toBeNull(); // קצר מדי
  });

  it("isValidIsraeliPhone מחזיר ערך בוליאני נכון", () => {
    expect(isValidIsraeliPhone("0501234567")).toBe(true);
    expect(isValidIsraeliPhone("xyz")).toBe(false);
  });

  it("chatIdToLocal ממיר חזרה לפורמט מקומי", () => {
    expect(chatIdToLocal("972501234567@c.us")).toBe("0501234567");
  });
});
