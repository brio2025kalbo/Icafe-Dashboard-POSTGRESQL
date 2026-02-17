import { useCafe } from "@/contexts/CafeContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingCart,
  CreditCard,
  Wallet,
  Award,
  Monitor,
  RotateCcw,
  Package,
  Clock,
  User,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useEffect } from "react";
import { format, subDays, parseISO, isSameDay } from "date-fns";
import { DateTimeRangePicker, type DateTimeRange } from "@/components/DateTimeRangePicker";
import { getBusinessDay, classifyShift, getStartHour, formatBusinessDay, SHIFT_ORDER, type ShiftType } from "@shared/businessDay";

function formatCurrency(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return "₱0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "₱0.00";
  return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString();
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subLabel?: string;
  subValue?: string;
  variant?: "default" | "danger";
}

function StatCard({ icon, label, value, subLabel, subValue, variant = "default" }: StatCardProps) {
  return (
    <div className={`p-3 rounded-lg ${variant === "danger" ? "bg-red-500/10 border border-red-500/20" : "bg-secondary/30"}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${variant === "danger" ? "text-red-400" : "text-foreground"}`}>{value}</p>
      {subLabel && (
        <p className="text-xs text-muted-foreground mt-0.5">
          {subLabel}: <span className="text-foreground/80">{subValue}</span>
        </p>
      )}
    </div>
  );
}

interface ShiftSelectorProps {
  cafeDbId: number;
  dateStart: string;
  dateEnd: string;
  timeStart?: string;
  timeEnd?: string;
  selectedShiftId: string;
  onShiftChange: (shiftId: string, staffName?: string, shiftStartTime?: string, shiftEndTime?: string) => void;
}

function ShiftSelector({ cafeDbId, dateStart, dateEnd, timeStart, timeEnd, selectedShiftId, onShiftChange }: ShiftSelectorProps) {
  const shiftsQuery = trpc.reports.shifts.useQuery(
    {
      cafeDbId,
      dateStart,
      dateEnd,
      timeStart,
      timeEnd,
    },
    { enabled: !!cafeDbId, refetchInterval: 30000 }
  );

  const shifts = useMemo(() => {
    const data = shiftsQuery.data as any;
    if (!data?.data) return [];
    const shiftList = Array.isArray(data.data) ? data.data : data.data.shift_list || data.data.shifts || [];
    return shiftList;
  }, [shiftsQuery.data]);

  // Group shifts by business day and sort: Morning → Afternoon → Graveyard
  const grandTotal = useMemo(() => {
    return shifts.reduce((sum: number, shift: any) => sum + Number(shift.total_amount || 0), 0);
  }, [shifts]);

  const groupedShifts = useMemo(() => {
    const groups: Map<string, Array<{ shift: any; shiftType: ShiftType; businessDay: string }>> = new Map();
    const dayTotals: Map<string, number> = new Map();

    shifts.forEach((shift: any) => {
      const startTime = shift.shift_start_time || "";
      if (!startTime) return;

      const businessDay = getBusinessDay(startTime);
      const hour = getStartHour(startTime);
      const shiftType = classifyShift(hour);
      const amount = Number(shift.total_amount || 0);

      if (!groups.has(businessDay)) {
        groups.set(businessDay, []);
        dayTotals.set(businessDay, 0);
      }
      groups.get(businessDay)!.push({ shift, shiftType, businessDay });
      dayTotals.set(businessDay, (dayTotals.get(businessDay) || 0) + amount);
    });

    // Sort business days descending (newest first)
    const sortedDays = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

    // Sort shifts within each day: Morning → Afternoon → Graveyard, then by start time
    const result: Array<{ shift: any; shiftType: ShiftType; businessDay: string; isFirstInGroup: boolean; dayTotal: number }> = [];
    sortedDays.forEach((day) => {
      const dayShifts = groups.get(day)!;
      const dayTotal = dayTotals.get(day) || 0;
      dayShifts.sort((a, b) => {
        const orderDiff = SHIFT_ORDER[a.shiftType] - SHIFT_ORDER[b.shiftType];
        if (orderDiff !== 0) return orderDiff;
        return (a.shift.shift_start_time || "").localeCompare(b.shift.shift_start_time || "");
      });
      dayShifts.forEach((item, idx) => {
        result.push({ ...item, isFirstInGroup: idx === 0, dayTotal });
      });
    });

    return result;
  }, [shifts]);

  const shiftTypeLabels: Record<ShiftType, string> = {
    morning: "AM",
    afternoon: "PM",
    graveyard: "GY",
  };

  const shiftTypeColors: Record<ShiftType, string> = {
    morning: "text-amber-400",
    afternoon: "text-orange-400",
    graveyard: "text-indigo-400",
  };

  return (
    <Select value={selectedShiftId} onValueChange={(val) => {
      if (val === "all") {
        onShiftChange("all", undefined, undefined, undefined);
      } else {
        const shift = shifts.find((s: any) => String(s.shift_id) === val);
        onShiftChange(val, shift?.shift_staff_name, shift?.shift_start_time, shift?.shift_end_time);
      }
    }}>
      <SelectTrigger className="w-[380px] h-8 text-xs bg-secondary/30 border-border/50">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <SelectValue placeholder={shiftsQuery.isLoading ? "Loading shifts..." : "All Shifts"} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center justify-between gap-4 text-xs w-full">
            <span>All Shifts</span>
            {grandTotal > 0 && <span className="text-emerald-400 font-mono">{formatCurrency(grandTotal)}</span>}
          </div>
        </SelectItem>
        {groupedShifts.map(({ shift, shiftType, businessDay, isFirstInGroup, dayTotal }) => {
          const staffName = shift.shift_staff_name || "Unknown";
          const startTime = shift.shift_start_time || "";
          const endTime = shift.shift_end_time || "";
          const amount = shift.total_amount || 0;
          const shiftId = String(shift.shift_id);

          const startTimeOnly = startTime ? startTime.replace(/^\d{4}-\d{2}-\d{2}\s/, "") : "";
          const endTimeOnly = endTime === "-" ? "Active" : endTime ? endTime.replace(/^\d{4}-\d{2}-\d{2}\s/, "") : "";

          // Show actual calendar dates for context
          const startCalDate = startTime ? startTime.split(" ")[0] : "";
          const endCalDate = endTime && endTime !== "-" ? endTime.split(" ")[0] : "";
          const startDateShort = startCalDate ? (() => {
            try { return format(parseISO(startCalDate), "MMM d"); } catch { return ""; }
          })() : "";
          const endDateShort = endCalDate ? (() => {
            try { return format(parseISO(endCalDate), "MMM d"); } catch { return ""; }
          })() : "";
          const crossesDate = endCalDate && startCalDate && endCalDate !== startCalDate;

          return (
            <div key={shiftId}>
              {isFirstInGroup && (
                <div className="px-2 py-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider border-b border-border/30 bg-secondary/20 sticky flex items-center justify-between">
                  <span>{formatBusinessDay(businessDay)}</span>
                  <span className="text-emerald-400 font-mono">{formatCurrency(dayTotal)}</span>
                </div>
              )}
              <SelectItem value={shiftId}>
                <div className="flex items-center gap-2 text-xs">
                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-medium min-w-[60px]">{staffName}</span>
                  <span className={`font-mono text-[10px] font-semibold ${shiftTypeColors[shiftType]} min-w-[20px]`}>
                    {shiftTypeLabels[shiftType]}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-blue-400 font-mono text-[11px]">{startDateShort}</span>
                  <span className="text-muted-foreground">
                    {startTimeOnly}
                    {' — '}
                    {crossesDate && <span className="text-blue-400 font-mono text-[11px]">{endDateShort} </span>}
                    {endTimeOnly}
                  </span>
                  {amount > 0 && (
                    <>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-emerald-400">{formatCurrency(amount)}</span>
                    </>
                  )}
                </div>
              </SelectItem>
            </div>
          );
        })}
        {!shiftsQuery.isLoading && shifts.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No shifts found for this period
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

function ReportContent({ data }: { data: any }) {
  if (!data) return null;

  const report = data.report || {};
  const sale = data.sale || {};
  const topup = data.topup || {};
  const refund = data.refund || {};
  const refundTopup = refund.topup || {};
  const productSalesItems = data.product_sales_items || [];
  const topMembers = data.top_five_members_topup || [];
  const topPcs = data.top_five_pc_spend || [];

  // Use only the total field to avoid double-counting (API returns both total and sub-fields)
  const refundSale = refund.sale || {};
  const totalRefundAmount = (refundTopup.total?.amount || 0) + (refundSale.total?.amount || 0);
  const totalRefundCount = (refundTopup.total?.number || 0) + (refundSale.total?.number || 0);

  const totalProductRefunds = productSalesItems.reduce(
    (acc: number, item: any) => acc + (item.order_refunded || 0),
    0
  );

  const hasRefunds = totalRefundAmount > 0 || totalRefundCount > 0 || totalProductRefunds > 0;

  // Compute expense: Cash - Sales - Top-ups + Refunds
  // Formula: Cash = Sales + Top-ups + Expenses - Refunds
  // Therefore: Expenses = Cash - Sales - Top-ups + Refunds
  const expense = Math.max(0, report.cash - sale.total - topup.amount + totalRefundAmount);

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard
          icon={<DollarSign className="h-3.5 w-3.5 text-emerald-400" />}
          label="Total Cash"
          value={formatCurrency(report.cash)}
        />
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />}
          label="Profit"
          value={formatCurrency(report.profit)}
        />
        <StatCard
          icon={<ShoppingCart className="h-3.5 w-3.5 text-amber-400" />}
          label="Sales Total"
          value={formatCurrency(sale.total)}
          subLabel="Products"
          subValue={`${formatNumber(sale.product?.number)} (${formatCurrency(sale.product?.total)})`}
        />
        <StatCard
          icon={<Wallet className="h-3.5 w-3.5 text-cyan-400" />}
          label="Top-ups"
          value={formatCurrency(topup.amount)}
          subLabel="Count"
          subValue={formatNumber(topup.number)}
        />
        <StatCard
          icon={<RotateCcw className="h-3.5 w-3.5 text-red-400" />}
          label="Refunds"
          value={formatCurrency(totalRefundAmount)}
          subLabel="Count"
          subValue={formatNumber(totalRefundCount)}
          variant={totalRefundAmount > 0 ? "danger" : "default"}
        />
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5 text-orange-400" />}
          label="Expenses"
          value={formatCurrency(expense)}
          variant="default"
        />
      </div>

      {/* Sales Breakdown */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          Sales Breakdown
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: "Cash Sales", data: sale.cash, icon: <DollarSign className="h-3 w-3" /> },
            { label: "By Balance", data: sale.by_balance, icon: <Wallet className="h-3 w-3" /> },
            { label: "Credit Card", data: sale.credit_card, icon: <CreditCard className="h-3 w-3" /> },
            { label: "Member Offers", data: sale.offer_member, icon: <Users className="h-3 w-3" /> },
            { label: "Coin", data: sale.coin, icon: <DollarSign className="h-3 w-3" /> },
          ].map((item) => (
            <div key={item.label} className="p-2 rounded bg-secondary/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1 text-muted-foreground">
                {item.icon}
                <span className="text-[10px]">{item.label}</span>
              </div>
              <p className="text-xs font-medium text-foreground">
                {formatCurrency(item.data?.total)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatNumber(item.data?.number)} txns
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top-up Breakdown */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          Top-up Breakdown
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Member", data: topup.member },
            { label: "Cash", data: topup.cash },
            { label: "Credit Card", data: topup.credit_card },
            { label: "QR", data: topup.qr },
          ].map((item) => (
            <div key={item.label} className="p-2 rounded bg-secondary/20">
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="text-xs font-medium text-foreground">
                {formatCurrency(item.data?.amount)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatNumber(item.data?.number)} txns
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Refund Breakdown */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <RotateCcw className="h-3 w-3 text-red-400" />
          Refund Breakdown
          {hasRefunds && (
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 ml-1">
              {formatNumber(totalRefundCount)} refunds
            </Badge>
          )}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: "Member", data: refundTopup.member },
            { label: "Cash", data: refundTopup.cash },
            { label: "Credit Card", data: refundTopup.credit_card },
            { label: "Prepaid", data: refundTopup.prepaid },
            { label: "Bonus", data: refundTopup.bonus },
          ].map((item) => {
            const amount = item.data?.amount || 0;
            const count = item.data?.number || 0;
            return (
              <div
                key={item.label}
                className={`p-2 rounded text-center ${
                  amount > 0 ? "bg-red-500/10 border border-red-500/20" : "bg-secondary/20"
                }`}
              >
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className={`text-xs font-medium ${amount > 0 ? "text-red-400" : "text-foreground"}`}>
                  {formatCurrency(amount)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatNumber(count)} txns
                </p>
              </div>
            );
          })}
        </div>

        {totalProductRefunds > 0 && (
          <div className="mt-2 p-2.5 rounded bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <Package className="h-4 w-4 text-red-400 shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-400">
                {formatNumber(totalProductRefunds)} product item(s) refunded
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Across {productSalesItems.filter((p: any) => (p.order_refunded || 0) > 0).length} product(s) in this period
              </p>
            </div>
          </div>
        )}

        {!hasRefunds && (
          <p className="text-xs text-muted-foreground/60 mt-1 italic">
            No refunds recorded in this period
          </p>
        )}
      </div>

      {/* Top Members & PCs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topMembers.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
              <Award className="h-3 w-3" /> Top Members (Top-up)
            </h4>
            <div className="space-y-1">
              {topMembers.slice(0, 5).map((m: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-1.5 rounded bg-secondary/20 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4 text-right">{i + 1}.</span>
                    <span className="text-foreground font-medium">{m.member}</span>
                  </span>
                  <span className="text-emerald-400 font-medium">{formatCurrency(m.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {topPcs.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
              <Monitor className="h-3 w-3" /> Top PCs (Spend)
            </h4>
            <div className="space-y-1">
              {topPcs.slice(0, 5).map((pc: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-1.5 rounded bg-secondary/20 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4 text-right">{i + 1}.</span>
                    <span className="text-foreground font-medium">{pc.pc_name}</span>
                  </span>
                  <span className="text-primary font-medium">
                    {formatCurrency(pc.total_spend)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CafeReportCard({ cafe, dateTimeRange }: { cafe: any; dateTimeRange: DateTimeRange }) {
  const [selectedShiftId, setSelectedShiftId] = useState("all");
  const [selectedStaffName, setSelectedStaffName] = useState<string | undefined>(undefined);
  const [shiftStartTime, setShiftStartTime] = useState<string | undefined>(undefined);
  const [shiftEndTime, setShiftEndTime] = useState<string | undefined>(undefined);

  // Reset shift selection when date range changes
  useEffect(() => {
    setSelectedShiftId("all");
    setSelectedStaffName(undefined);
    setShiftStartTime(undefined);
    setShiftEndTime(undefined);
  }, [dateTimeRange.dateStart, dateTimeRange.dateEnd, dateTimeRange.timeStart, dateTimeRange.timeEnd]);

  // Fetch shift-aggregated data for "All Shifts" — sums individual shift reports server-side
  // This avoids the bug where raw date-range queries include non-shift transactions
  const shiftAggregatedQuery = trpc.reports.shiftAggregated.useQuery(
    {
      cafeDbId: cafe.cafeDbId,
      dateStart: dateTimeRange.dateStart,
      dateEnd: dateTimeRange.dateEnd,
      timeStart: dateTimeRange.timeStart,
      timeEnd: dateTimeRange.timeEnd,
    },
    { enabled: !!cafe.cafeDbId, refetchInterval: 30000 }
  );

  // Parse shift start/end into date + time parts for the reportData API
  const shiftDateRange = useMemo(() => {
    if (!shiftStartTime) return null;
    // shift_start_time format: "2026-02-10 08:56:40"
    const startParts = shiftStartTime.split(" ");
    const startDate = startParts[0] || "";
    const startTimePart = startParts[1] ? startParts[1].substring(0, 5) : "00:00"; // HH:MM

    let endDate = startDate;
    let endTimePart = "23:59";
    if (shiftEndTime && shiftEndTime !== "-") {
      const endParts = shiftEndTime.split(" ");
      endDate = endParts[0] || startDate;
      endTimePart = endParts[1] ? endParts[1].substring(0, 5) : "23:59";
    }

    return { dateStart: startDate, dateEnd: endDate, timeStart: startTimePart, timeEnd: endTimePart };
  }, [shiftStartTime, shiftEndTime]);

  // Fetch report data using the shift's actual time range + staff name (for individual shift selection)
  const shiftReportQuery = trpc.reports.data.useQuery(
    {
      cafeDbId: cafe.cafeDbId,
      dateStart: shiftDateRange?.dateStart || "",
      dateEnd: shiftDateRange?.dateEnd || "",
      timeStart: shiftDateRange?.timeStart,
      timeEnd: shiftDateRange?.timeEnd,
      logStaffName: selectedStaffName,
    },
    { enabled: selectedShiftId !== "all" && !!shiftDateRange && !!selectedStaffName }
  );

  const handleShiftChange = (shiftId: string, staffName?: string, startTime?: string, endTime?: string) => {
    setSelectedShiftId(shiftId);
    setSelectedStaffName(staffName);
    setShiftStartTime(startTime);
    setShiftEndTime(endTime);
  };

  // Use shift-aggregated data for "All Shifts", individual shift data for specific shift
  const displayData = useMemo(() => {
    if (selectedShiftId === "all") {
      // Prefer shift-aggregated data (sums individual shifts) over raw date-range query
      if (shiftAggregatedQuery.data) {
        const aggData = (shiftAggregatedQuery.data as any)?.data;
        if (aggData && (aggData.report || aggData.sale || aggData.topup)) {
          return aggData;
        }
      }
      // Fall back to parent's raw data while shift-aggregated is loading
      return cafe.data;
    }

    // Use reportData filtered by the shift's actual time range + staff name
    if (shiftReportQuery.data) {
      const filtered = (shiftReportQuery.data as any)?.data;
      if (filtered && (filtered.report || filtered.sale || filtered.topup)) {
        return filtered;
      }
    }

    // If query finished but returned no usable data, fall back to all-shifts data
    if (!shiftReportQuery.isLoading) {
      return cafe.data;
    }

    return null; // still loading
  }, [selectedShiftId, shiftAggregatedQuery.data, shiftReportQuery.data, shiftReportQuery.isLoading, cafe.data]);

  const isShiftLoading = selectedShiftId !== "all" && displayData === null;
  const isShiftError = selectedShiftId !== "all" && !isShiftLoading && shiftReportQuery.isError;

  if (!cafe.data && selectedShiftId === "all") {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {cafe.cafeName}
            <Badge variant="secondary" className="text-xs ml-auto">
              {cafe.code === 200 ? "No Data" : `Error ${cafe.code}`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {cafe.code === 200
              ? "No report data available for the selected period."
              : `API returned error ${cafe.code}. ${cafe.message || "Please check your API credentials and IP whitelist."}`}
          </p>
        </CardContent>
      </Card>
    );
  }

  const report = displayData?.report || cafe.data?.report || {};

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2 flex-wrap">
          <Building2 className="h-4 w-4 text-primary" />
          {cafe.cafeName}
          <ShiftSelector
            cafeDbId={cafe.cafeDbId}
            dateStart={dateTimeRange.dateStart}
            dateEnd={dateTimeRange.dateEnd}
            timeStart={dateTimeRange.timeStart}
            timeEnd={dateTimeRange.timeEnd}
            selectedShiftId={selectedShiftId}
            onShiftChange={handleShiftChange}
          />
          <Badge variant="default" className="text-xs ml-auto">
            {report.report_start || ""} — {report.report_end || ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isShiftLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : isShiftError ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Failed to load shift-specific data. Showing overall report instead.</p>
            <ReportContent data={cafe.data} />
          </div>
        ) : (
          <ReportContent data={displayData} />
        )}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { cafes, selectedCafeId } = useCafe();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [dateTimeRange, setDateTimeRange] = useState<DateTimeRange>({
    dateStart: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    dateEnd: format(new Date(), "yyyy-MM-dd"),
    timeStart: "00:00",
    timeEnd: "23:59",
  });

  const activeCafeId = selectedCafeId === "all" ? null : selectedCafeId;

  // For single cafe: use shiftAggregated to get correct shift-based totals
  const singleReportQuery = trpc.reports.shiftAggregated.useQuery(
    {
      cafeDbId: activeCafeId || 0,
      dateStart: dateTimeRange.dateStart,
      dateEnd: dateTimeRange.dateEnd,
      timeStart: dateTimeRange.timeStart,
      timeEnd: dateTimeRange.timeEnd,
    },
    { enabled: !!activeCafeId, refetchInterval: 30000 }
  );

  // For all cafes: use shiftAggregatedCombined to get correct shift-based totals per cafe
  const combinedReportQuery = trpc.reports.shiftAggregatedCombined.useQuery(
    {
      dateStart: dateTimeRange.dateStart,
      dateEnd: dateTimeRange.dateEnd,
      timeStart: dateTimeRange.timeStart,
      timeEnd: dateTimeRange.timeEnd,
    },
    { enabled: selectedCafeId === "all" && cafes.length > 0, refetchInterval: 30000 }
  );

  // Track last updated time
  useEffect(() => {
    const activeQuery = selectedCafeId === "all" ? combinedReportQuery : singleReportQuery;
    if (activeQuery.dataUpdatedAt) {
      setLastUpdated(new Date(activeQuery.dataUpdatedAt));
    }
  }, [singleReportQuery.dataUpdatedAt, combinedReportQuery.dataUpdatedAt, selectedCafeId]);

  const reportData = useMemo(() => {
    if (selectedCafeId === "all" && combinedReportQuery.data) {
      return combinedReportQuery.data;
    }
    if (activeCafeId && singleReportQuery.data) {
      const cafe = cafes.find((c) => c.id === activeCafeId);
      return [
        {
          cafeDbId: activeCafeId,
          cafeName: cafe?.name || "Unknown",
          cafeId: cafe?.cafeId || "",
          data: (singleReportQuery.data as any)?.data,
          code: (singleReportQuery.data as any)?.code,
          message: (singleReportQuery.data as any)?.message,
        },
      ];
    }
    return [];
  }, [selectedCafeId, combinedReportQuery.data, singleReportQuery.data, activeCafeId, cafes]);

  const isLoading =
    selectedCafeId === "all" ? combinedReportQuery.isLoading : singleReportQuery.isLoading;

  if (cafes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <BarChart3 className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Add a cafe in Settings to view reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sales and billing reports with date and time range filtering
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            <span>
              Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} · Auto-refresh 30s
            </span>
          </div>
          <DateTimeRangePicker value={dateTimeRange} onChange={setDateTimeRange} />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}

      {!isLoading && reportData.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">No report data available for the selected period</p>
          </CardContent>
        </Card>
      )}

      {reportData.map((cafe: any) => (
        <CafeReportCard key={cafe.cafeDbId} cafe={cafe} dateTimeRange={dateTimeRange} />
      ))}
    </div>
  );
}
