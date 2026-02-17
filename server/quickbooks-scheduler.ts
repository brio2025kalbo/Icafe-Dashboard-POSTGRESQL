import * as db from "./db";
import { generateDailyReport } from "./quickbooks-report";
import { createJournalEntry, refreshAccessToken } from "./quickbooks-api";
import { decrypt } from "./encryption";

/**
 * Check and process auto-send settings for all enabled cafes
 * This function should be called periodically (e.g., every 5-15 minutes)
 */
export async function processAutoSendReports() {
  console.log("[QB Scheduler] Checking auto-send settings...");
  
  try {
    const settings = await db.getAllEnabledQbAutoSendSettings();
    
    if (settings.length === 0) {
      console.log("[QB Scheduler] No enabled auto-send settings found");
      return;
    }

    console.log(`[QB Scheduler] Found ${settings.length} enabled auto-send setting(s)`);

    for (const setting of settings) {
      try {
        const shouldSend = await shouldSendReport(setting);
        
        if (shouldSend) {
          console.log(`[QB Scheduler] Triggering auto-send for cafe ${setting.cafeId}, mode: ${setting.mode}`);
          await sendScheduledReport(setting);
        }
      } catch (error) {
        console.error(`[QB Scheduler] Error processing setting ${setting.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[QB Scheduler] Error in processAutoSendReports:", error);
  }
}

/**
 * Determine if a report should be sent based on the schedule mode
 */
async function shouldSendReport(setting: any): Promise<boolean> {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

  switch (setting.mode) {
    case "daily_time":
      // Check if current time matches the schedule time (within 5-minute window)
      if (!setting.scheduleTime) return false;
      const [schedHour, schedMin] = setting.scheduleTime.split(":").map(Number);
      const schedMinutes = schedHour * 60 + schedMin;
      const currentMinutes = currentHour * 60 + currentMinute;
      // Trigger if within 5 minutes of schedule time
      return Math.abs(currentMinutes - schedMinutes) < 5;

    case "business_day_end":
      // Business day ends at 6 AM - check if it's between 6:00 and 6:10 AM
      return currentHour === 6 && currentMinute < 10;

    case "last_shift":
      // Check if there's a recently closed shift (within last 15 minutes)
      return await hasRecentlyClosedShift(setting);

    default:
      return false;
  }
}

/**
 * Check if there's a recently closed shift for the cafe
 */
async function hasRecentlyClosedShift(setting: any): Promise<boolean> {
  try {
    // Get cafe details
    const cafe = await db.getCafeById(setting.cafeId, setting.userId);
    if (!cafe) return false;

    const apiKey = decrypt(cafe.apiKeyEncrypted);
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    
    // Calculate tomorrow for date_end
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    // Import icafe-api dynamically to avoid circular dependencies
    const icafe = await import("./icafe-api");
    const shiftListResponse = await icafe.getShiftList(
      { cafeId: cafe.cafeId, apiKey },
      {
        date_start: todayStr,
        date_end: tomorrowStr,
        time_start: "00:00",
        time_end: "23:59",
      }
    );

    if (shiftListResponse.code !== 200 || !shiftListResponse.data) {
      return false;
    }

    const shifts = (shiftListResponse.data as any[]).filter((shift: any) => 
      shift.log_staff_name && shift.log_staff_name !== "All Shifts"
    );

    // Check if any shift ended in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    for (const shift of shifts) {
      if (shift.log_end_time) {
        const endTime = new Date(shift.log_end_time);
        if (endTime > fifteenMinutesAgo && endTime <= new Date()) {
          console.log(`[QB Scheduler] Found recently closed shift: ${shift.log_staff_name} at ${shift.log_end_time}`);
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("[QB Scheduler] Error checking for recently closed shift:", error);
    return false;
  }
}

/**
 * Send a scheduled report for a cafe
 */
async function sendScheduledReport(setting: any) {
  try {
    // Get cafe details
    const cafe = await db.getCafeById(setting.cafeId, setting.userId);
    if (!cafe) {
      console.error(`[QB Scheduler] Cafe ${setting.cafeId} not found`);
      return;
    }

    const apiKey = decrypt(cafe.apiKeyEncrypted);

    // Get QuickBooks token
    const qbToken = await db.getQbToken(setting.userId);
    if (!qbToken) {
      console.error(`[QB Scheduler] QuickBooks token not found for user ${setting.userId}`);
      return;
    }

    // Refresh token if needed
    let accessToken = qbToken.accessToken;
    if (new Date(qbToken.accessTokenExpiresAt) <= new Date()) {
      console.log("[QB Scheduler] Access token expired, refreshing...");
      const refreshed = await refreshAccessToken(qbToken.refreshToken);
      accessToken = refreshed.accessToken;
      
      await db.upsertQbToken(setting.userId, {
        realmId: qbToken.realmId,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        accessTokenExpiresAt: new Date(Date.now() + refreshed.accessTokenExpiresIn * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + refreshed.refreshTokenExpiresIn * 1000),
      });
    }

    // Determine which business date to send
    const businessDate = getBusinessDateToSend(setting.mode);
    
    // Check if already sent
    const existingLog = await db.getQbReportLogByDate(setting.userId, setting.cafeId, businessDate);
    if (existingLog) {
      console.log(`[QB Scheduler] Report for ${cafe.name} on ${businessDate} already sent, skipping`);
      return;
    }

    console.log(`[QB Scheduler] Generating report for ${cafe.name} on ${businessDate}`);

    // Generate report
    const report = await generateDailyReport({
      cafeId: cafe.cafeId,
      apiKey,
      cafeName: cafe.name,
      businessDate,
    });

    const totalRevenue = report.totals.sales + report.totals.topups;

    // Convert report to journal entry format
    const journalEntry = {
      txnDate: businessDate,
      //: `${cafe.name}-${businessDate}`,
      docNumber: buildDocNumber(cafe.name, businessDate),
      privateNote: `Auto-generated report for ${cafe.name} on ${businessDate} (${report.shiftCount} shifts)`,
      /*lines: [
        // Debit: Cash
        {
          description: `Cash - ${cafe.name}`,
          amount: report.totals.cash,
          postingType: "Debit" as const,
          accountRef: { name: "Cash", value: "202" }, // Default cash account
        },
        // Credit: Revenue
        {
          description: `Revenue - ${cafe.name}`,
          amount: report.totals.sales + report.totals.topups,
          postingType: "Credit" as const,
          accountRef: { name: "Revenue", value: "206" }, // Default revenue account
        },
      ],*/ 
      lines: [
        {
          description: `Cash - ${cafe.name}`,
          amount: totalRevenue,
          postingType: "Debit",
          accountRef: { name: "Cash", value: "202" },
        },
        {
          description: `Revenue - ${cafe.name}`,
          amount: totalRevenue,
          postingType: "Credit",
          accountRef: { name: "Revenue", value: "206" },
        },
      ],

    };

    // Post to QuickBooks
    console.log(`[QB Scheduler] Posting journal entry for ${cafe.name} on ${businessDate}`);
    const journalEntryResponse = await createJournalEntry(accessToken, qbToken.realmId, journalEntry);

    // Log success
    await db.addQbReportLog({
      userId: setting.userId,
      cafeId: setting.cafeId,
      cafeName: cafe.name,
      businessDate,
      journalEntryId: journalEntryResponse.Id,
      totalCash: report.totals.cash,
      shiftCount: report.shiftCount,
      status: "success",
    });

    console.log(`[QB Scheduler] Successfully sent report for ${cafe.name} on ${businessDate}`);
  } catch (error: any) {
    console.error(`[QB Scheduler] Error sending scheduled report:`, error);
    
    // Log failure
    try {
      const cafe = await db.getCafeById(setting.cafeId, setting.userId);
      const businessDate = getBusinessDateToSend(setting.mode);
      
      await db.addQbReportLog({
        userId: setting.userId,
        cafeId: setting.cafeId,
        cafeName: cafe?.name || "Unknown",
        businessDate,
        totalCash: 0,
        shiftCount: 0,
        status: "failed",
        errorMessage: error.message || String(error),
      });
    } catch (logError) {
      console.error("[QB Scheduler] Error logging failure:", logError);
    }
  }
}

/**
 * Get the business date to send based on the schedule mode
 */
function getBusinessDateToSend(mode: string): string {
  const now = new Date();
  
  if (mode === "business_day_end") {
    // Business day ends at 6 AM - send yesterday's report
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  } else {
    // For daily_time and last_shift, send today's report (or yesterday if before 6 AM)
    if (now.getHours() < 6) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    } else {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
  }
}

/**
 * Start the scheduler (call this once when server starts)
 */
export function startScheduler() {
  console.log("[QB Scheduler] Starting QuickBooks auto-send scheduler");
  
  // Run every 5 minutes
  const intervalMs = 5 * 60 * 1000;
  
  // Run immediately on start
  processAutoSendReports().catch(error => {
    console.error("[QB Scheduler] Error in initial run:", error);
  });
  
  // Then run every 5 minutes
  setInterval(() => {
    processAutoSendReports().catch(error => {
      console.error("[QB Scheduler] Error in scheduled run:", error);
    });
  }, intervalMs);
  
  console.log("[QB Scheduler] Scheduler started, checking every 5 minutes");
}

function buildDocNumber(cafeName: string, date: string): string {
  // Remove spaces & symbols
  const cleanName = cafeName.replace(/[^a-zA-Z0-9]/g, "");

  // YYYYMMDD
  const shortDate = date.replace(/-/g, "");

  // Reserve space for "-YYYYMMDD" (9 chars)
  const maxNameLength = 21 - shortDate.length - 1;

  const shortName = cleanName.slice(0, maxNameLength);

  return `${shortName}-${shortDate}`;
}

