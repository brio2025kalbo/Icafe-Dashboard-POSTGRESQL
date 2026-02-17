/**
 * Business Day Utilities
 *
 * Internet cafes operate on a 3-shift cycle:
 *   Morning    → starts ~08:00 (06:00-15:59)
 *   Afternoon  → starts ~16:00 (16:00-23:59)
 *   Graveyard  → starts ~00:00 (00:00-05:59)
 *
 * The business day boundary is 06:00 AM.
 * Any shift starting before 06:00 AM belongs to the PREVIOUS calendar day's business day.
 *
 * Example for business day "Feb 9":
 *   Piolo     (Morning)    08:05 Feb 9  – 16:04 Feb 9
 *   Alexandra (Afternoon)  16:05 Feb 9  – 00:17 Feb 10
 *   Zaldy     (Graveyard)  00:20 Feb 10 – 08:05 Feb 10  ← belongs to Feb 9 business day
 */

/** The hour (0-23) at which a new business day starts */
export const BUSINESS_DAY_START_HOUR = 6;

export type ShiftType = "morning" | "afternoon" | "graveyard";

/**
 * Classify a shift based on its start hour.
 *   Morning:    06:00 – 15:59
 *   Afternoon:  16:00 – 23:59
 *   Graveyard:  00:00 – 05:59
 */
export function classifyShift(startHour: number): ShiftType {
  if (startHour >= BUSINESS_DAY_START_HOUR && startHour < 16) return "morning";
  if (startHour >= 16) return "afternoon";
  return "graveyard"; // 0-5
}

/** Sort order for shift types within a business day */
export const SHIFT_ORDER: Record<ShiftType, number> = {
  morning: 0,
  afternoon: 1,
  graveyard: 2,
};

/**
 * Get the business day date string (YYYY-MM-DD) for a given shift start datetime.
 * If the shift starts before BUSINESS_DAY_START_HOUR (06:00), it belongs to the previous calendar day.
 *
 * @param startDateTime - ISO-like datetime string, e.g. "2026-02-10 00:20:00" or "2026-02-10T00:20:00"
 * @returns Business day date string in YYYY-MM-DD format
 */
export function getBusinessDay(startDateTime: string): string {
  // Parse "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ss"
  const normalized = startDateTime.replace("T", " ");
  const [datePart, timePart] = normalized.split(" ");
  if (!datePart) return startDateTime.split(" ")[0] || startDateTime;

  const hour = timePart ? parseInt(timePart.split(":")[0], 10) : 12;

  if (hour < BUSINESS_DAY_START_HOUR) {
    // This shift belongs to the previous calendar day's business day
    const [y, m, d] = datePart.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  return datePart;
}

/**
 * Extract the start hour from a datetime string.
 * @param startDateTime - e.g. "2026-02-10 08:05:00"
 * @returns hour number (0-23)
 */
export function getStartHour(startDateTime: string): number {
  const normalized = startDateTime.replace("T", " ");
  const timePart = normalized.split(" ")[1];
  if (!timePart) return 12;
  return parseInt(timePart.split(":")[0], 10);
}

/**
 * Get the business day date range for "today" that accounts for the 06:00 boundary.
 *
 * If current time is before 06:00, "today's business day" is actually yesterday's date.
 * The API query should span from yesterday 06:00 to today 05:59.
 *
 * For the API, we need to query two calendar days and let the shift classification
 * handle the grouping. But since the iCafeCloud report API uses date_start/date_end
 * with time_start/time_end, we return the appropriate date range.
 *
 * @returns { businessDate, dateStart, dateEnd, timeStart, timeEnd }
 */
export function getTodayBusinessDayRange(): {
  businessDate: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
} {
  // Cafes operate in Philippine timezone (UTC+8)
  const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
  const nowUtc = new Date();
  const nowPH = new Date(nowUtc.getTime() + PH_OFFSET_MS);
  const currentHourPH = nowPH.getUTCHours();

  const businessDate = new Date(Date.UTC(
    nowPH.getUTCFullYear(),
    nowPH.getUTCMonth(),
    nowPH.getUTCDate()
  ));
  if (currentHourPH < BUSINESS_DAY_START_HOUR) {
    // Before 6 AM PH time — still "yesterday's" business day
    businessDate.setUTCDate(businessDate.getUTCDate() - 1);
  }

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

  const businessDateStr = fmt(businessDate);

  // The business day spans from businessDate 06:00 to businessDate+1 05:59
  const nextDay = new Date(businessDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDayStr = fmt(nextDay);

  // We need to query from businessDate to nextDay to capture graveyard shifts
  return {
    businessDate: businessDateStr,
    dateStart: businessDateStr,
    dateEnd: nextDayStr,
    timeStart: "06:00",
    timeEnd: "05:59",
  };
}

/**
 * Format a business day date for display (e.g., "Mon, Feb 9")
 */
export function formatBusinessDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}
