import { describe, expect, it } from "vitest";
import {
  getBusinessDay,
  classifyShift,
  getStartHour,
  formatBusinessDay,
  SHIFT_ORDER,
  BUSINESS_DAY_START_HOUR,
  getTodayBusinessDayRange,
} from "./businessDay";

describe("businessDay utilities", () => {
  describe("BUSINESS_DAY_START_HOUR", () => {
    it("should be 6 (06:00 AM)", () => {
      expect(BUSINESS_DAY_START_HOUR).toBe(6);
    });
  });

  describe("classifyShift", () => {
    it("classifies morning shifts (06:00-15:59)", () => {
      expect(classifyShift(6)).toBe("morning");
      expect(classifyShift(8)).toBe("morning");
      expect(classifyShift(12)).toBe("morning");
      expect(classifyShift(15)).toBe("morning");
    });

    it("classifies afternoon shifts (16:00-23:59)", () => {
      expect(classifyShift(16)).toBe("afternoon");
      expect(classifyShift(18)).toBe("afternoon");
      expect(classifyShift(20)).toBe("afternoon");
      expect(classifyShift(23)).toBe("afternoon");
    });

    it("classifies graveyard shifts (00:00-05:59)", () => {
      expect(classifyShift(0)).toBe("graveyard");
      expect(classifyShift(1)).toBe("graveyard");
      expect(classifyShift(3)).toBe("graveyard");
      expect(classifyShift(5)).toBe("graveyard");
    });
  });

  describe("SHIFT_ORDER", () => {
    it("morning comes first, then afternoon, then graveyard", () => {
      expect(SHIFT_ORDER.morning).toBeLessThan(SHIFT_ORDER.afternoon);
      expect(SHIFT_ORDER.afternoon).toBeLessThan(SHIFT_ORDER.graveyard);
    });
  });

  describe("getStartHour", () => {
    it("extracts hour from datetime string with space separator", () => {
      expect(getStartHour("2026-02-10 08:05:00")).toBe(8);
      expect(getStartHour("2026-02-10 16:05:00")).toBe(16);
      expect(getStartHour("2026-02-10 00:20:00")).toBe(0);
      expect(getStartHour("2026-02-10 23:59:59")).toBe(23);
    });

    it("extracts hour from datetime string with T separator", () => {
      expect(getStartHour("2026-02-10T08:05:00")).toBe(8);
      expect(getStartHour("2026-02-10T00:20:00")).toBe(0);
    });

    it("returns 12 as default when no time part", () => {
      expect(getStartHour("2026-02-10")).toBe(12);
    });
  });

  describe("getBusinessDay", () => {
    it("returns same date for morning shifts (after 06:00)", () => {
      expect(getBusinessDay("2026-02-09 08:05:00")).toBe("2026-02-09");
      expect(getBusinessDay("2026-02-09 12:00:00")).toBe("2026-02-09");
      expect(getBusinessDay("2026-02-09 15:59:59")).toBe("2026-02-09");
    });

    it("returns same date for afternoon shifts (after 16:00)", () => {
      expect(getBusinessDay("2026-02-09 16:05:00")).toBe("2026-02-09");
      expect(getBusinessDay("2026-02-09 20:00:00")).toBe("2026-02-09");
      expect(getBusinessDay("2026-02-09 23:59:59")).toBe("2026-02-09");
    });

    it("returns PREVIOUS date for graveyard shifts (before 06:00)", () => {
      // Zaldy starts at 00:20 on Feb 10 → belongs to Feb 9 business day
      expect(getBusinessDay("2026-02-10 00:20:00")).toBe("2026-02-09");
      expect(getBusinessDay("2026-02-10 01:30:00")).toBe("2026-02-09");
      expect(getBusinessDay("2026-02-10 05:59:59")).toBe("2026-02-09");
    });

    it("handles month boundaries correctly", () => {
      // March 1 at 02:00 → belongs to Feb 28 (non-leap year)
      expect(getBusinessDay("2027-03-01 02:00:00")).toBe("2027-02-28");
      // March 1 at 02:00 in leap year → belongs to Feb 29
      expect(getBusinessDay("2028-03-01 02:00:00")).toBe("2028-02-29");
    });

    it("handles year boundaries correctly", () => {
      // Jan 1 at 03:00 → belongs to Dec 31 of previous year
      expect(getBusinessDay("2027-01-01 03:00:00")).toBe("2026-12-31");
    });

    it("handles the exact boundary hour (06:00) as current day", () => {
      expect(getBusinessDay("2026-02-10 06:00:00")).toBe("2026-02-10");
    });

    it("handles T-separator format", () => {
      expect(getBusinessDay("2026-02-10T00:20:00")).toBe("2026-02-09");
      expect(getBusinessDay("2026-02-10T08:00:00")).toBe("2026-02-10");
    });
  });

  describe("formatBusinessDay", () => {
    it("formats date as 'Day, Mon D'", () => {
      expect(formatBusinessDay("2026-02-09")).toBe("Mon, Feb 9");
      expect(formatBusinessDay("2026-02-10")).toBe("Tue, Feb 10");
    });
  });

  describe("getTodayBusinessDayRange", () => {
    it("returns a valid business day range object", () => {
      const range = getTodayBusinessDayRange();
      expect(range).toHaveProperty("businessDate");
      expect(range).toHaveProperty("dateStart");
      expect(range).toHaveProperty("dateEnd");
      expect(range.timeStart).toBe("06:00");
      expect(range.timeEnd).toBe("05:59");
      // dateEnd should be one day after dateStart
      const startParts = range.dateStart.split("-").map(Number);
      const endParts = range.dateEnd.split("-").map(Number);
      const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
      const diffMs = endDate.getTime() - startDate.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000); // exactly 1 day apart
    });
  });

  describe("real-world scenario: Feb 9 business day", () => {
    it("groups Piolo (Morning), Alexandra (Afternoon), Zaldy (Graveyard) under Feb 9", () => {
      // Piolo: Morning shift 08:05 Feb 9 → 16:04 Feb 9
      expect(getBusinessDay("2026-02-09 08:05:00")).toBe("2026-02-09");
      expect(classifyShift(getStartHour("2026-02-09 08:05:00"))).toBe("morning");

      // Alexandra: Afternoon shift 16:05 Feb 9 → 00:17 Feb 10
      expect(getBusinessDay("2026-02-09 16:05:00")).toBe("2026-02-09");
      expect(classifyShift(getStartHour("2026-02-09 16:05:00"))).toBe("afternoon");

      // Zaldy: Graveyard shift 00:20 Feb 10 → 08:05 Feb 10
      expect(getBusinessDay("2026-02-10 00:20:00")).toBe("2026-02-09");
      expect(classifyShift(getStartHour("2026-02-10 00:20:00"))).toBe("graveyard");
    });

    it("does NOT group Elbert (Graveyard 00:16 Feb 9) under Feb 9 — he belongs to Feb 8", () => {
      // Elbert: Graveyard shift 00:16 Feb 9 → belongs to Feb 8 business day
      expect(getBusinessDay("2026-02-09 00:16:00")).toBe("2026-02-08");
      expect(classifyShift(getStartHour("2026-02-09 00:16:00"))).toBe("graveyard");
    });

    it("sorts shifts correctly within a business day", () => {
      const shifts = [
        { start: "2026-02-10 00:20:00", name: "Zaldy" },   // Graveyard → Feb 9
        { start: "2026-02-09 16:05:00", name: "Alexandra" }, // Afternoon → Feb 9
        { start: "2026-02-09 08:05:00", name: "Piolo" },     // Morning → Feb 9
      ];

      const sorted = shifts
        .filter(s => getBusinessDay(s.start) === "2026-02-09")
        .sort((a, b) => {
          const typeA = classifyShift(getStartHour(a.start));
          const typeB = classifyShift(getStartHour(b.start));
          return SHIFT_ORDER[typeA] - SHIFT_ORDER[typeB];
        });

      expect(sorted.map(s => s.name)).toEqual(["Piolo", "Alexandra", "Zaldy"]);
    });
  });
});
