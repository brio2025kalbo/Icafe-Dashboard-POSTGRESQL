import * as icafe from "./icafe-api";

/**
 * Get the time boundaries for a business day (6 AM to 6 AM next day)
 */
function getBusinessDayBoundary(businessDate: string): { startTime: string; endTime: string } {
  // Business day starts at 06:00 on businessDate and ends at 05:59 the next day
  return {
    startTime: "06:00",
    endTime: "05:59",
  };
}

/**
 * Fetch all shifts for a given business date and cafe
 */
export async function getShiftsForBusinessDay(params: {
  cafeId: string;
  apiKey: string;
  businessDate: string; // YYYY-MM-DD
}) {
  const { cafeId, apiKey, businessDate } = params;
  
  // Get business day boundaries (6 AM to 6 AM next day in PH timezone)
  const { startTime, endTime } = getBusinessDayBoundary(businessDate);
  
  // Calculate next day for date_end
  const [y, m, d] = businessDate.split("-").map(Number);
  const nextDay = new Date(y, m - 1, d);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;
  
  // Fetch shift list for the date range
  const shiftListResponse = await icafe.getShiftList(
    { cafeId, apiKey },
    {
      date_start: businessDate,
      date_end: nextDayStr,
      time_start: startTime,
      time_end: endTime,
    }
  );

  if (shiftListResponse.code !== 200 || !shiftListResponse.data) {
    throw new Error(`Failed to fetch shift list: ${shiftListResponse.message}`);
  }

  //return (shiftListResponse.data as any[]).filter((shift: any) => {
    // Only include actual shifts (not "All Shifts" summary)
  //  return shift.log_staff_name && shift.log_staff_name !== "All Shifts";
  //});
  const shifts = Array.isArray(shiftListResponse.data)
  ? shiftListResponse.data
  : shiftListResponse.data?.shift_list || [];

  return shifts.filter((shift: any) =>
    shift.shift_staff_name &&
    shift.shift_staff_name !== "All Shifts" &&
    shift.shift_end_time !== "-"
  );

}

/**
 * Fetch report data for a single shift
 */
export async function getShiftReport(params: {
  cafeId: string;
  apiKey: string;
  shift: any;
}) {
  const { cafeId, apiKey, shift } = params;

  const staffName = shift.shift_staff_name;

  if (!staffName) {
    throw new Error("Shift missing staff name");
  }

  const startParts = shift.shift_start_time.split(" ");
  const dateStart = startParts[0];
  const timeStart = startParts[1] || "00:00";

  let dateEnd: string;
  let timeEnd: string;

  // 🔥 HANDLE ACTIVE SHIFT
  if (!shift.shift_end_time || shift.shift_end_time === "-") {
    const now = new Date();
    dateEnd = now.toISOString().split("T")[0];
    timeEnd = now.toTimeString().substring(0, 5);
  } else {
    const endParts = shift.shift_end_time.split(" ");
    dateEnd = endParts[0];
    timeEnd = endParts[1] || "23:59";
  }

  const reportResponse = await icafe.getReportData(
    { cafeId, apiKey },
    {
      date_start: dateStart,
      date_end: dateEnd,
      time_start: timeStart,
      time_end: timeEnd,
      log_staff_name: staffName,
    }
  );

  if (reportResponse.code !== 200 || !reportResponse.data) {
    throw new Error(
      `Failed to fetch report for shift ${staffName}: ${reportResponse.message}`
    );
  }

  return reportResponse.data;
}


/**
 * Generate a daily report with shift breakdowns for QuickBooks
 */
export async function generateDailyReport(params: {
  cafeId: string;
  apiKey: string;
  cafeName: string;
  businessDate: string; // YYYY-MM-DD
}) {
  const { cafeId, apiKey, cafeName, businessDate } = params;

  // Fetch all shifts for the business day
  const shifts = await getShiftsForBusinessDay({ cafeId, apiKey, businessDate });

  if (shifts.length === 0) {
    throw new Error(`No shifts found for ${cafeName} on ${businessDate}`);
  }

  // Fetch report data for each shift
  const shiftReports = await Promise.all(
    shifts.map(async (shift: any) => {
      console.log("ShiftReports SHIFTS:", shifts);
      const reportData = await getShiftReport({ cafeId, apiKey, shift });
      return {
        staffName: shift.shift_staff_name,
        shiftType: shift.log_type || "Unknown",
        startTime: shift.shift_start_time,
        endTime: shift.shift_end_time,
        cash: (reportData as any).report?.cash || 0,
        sales: (reportData as any).sale?.total || 0,
        topups: (reportData as any).topup?.amount || 0,
        refunds: ((reportData as any).refund?.topup?.total?.amount || 0) + ((reportData as any).refund?.sale?.total?.amount || 0),
        profit: (reportData as any).report?.profit || 0,
      };
    })
  );

  // Calculate totals
  const totals = shiftReports.reduce(
    (acc: { cash: number; sales: number; topups: number; refunds: number; profit: number }, shift: any) => ({
      cash: acc.cash + shift.cash,
      sales: acc.sales + shift.sales,
      topups: acc.topups + shift.topups,
      refunds: acc.refunds + shift.refunds,
      profit: acc.profit + shift.profit,
    }),
    { cash: 0, sales: 0, topups: 0, refunds: 0, profit: 0 }
  );

  return {
    businessDate,
    cafeName,
    shiftCount: shifts.length,
    shifts: shiftReports,
    totals,
  };
}
