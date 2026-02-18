import { useCafe } from "@/contexts/CafeContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Users,
  Zap,
  Building2,
  Wifi,
  WifiOff,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  ArrowDownRight,
  Gamepad2,
  MessageSquare,
} from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { FeedbackLog } from "@shared/feedback-types";

//function formatCurrency(value: number): string {
//  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//}
const formatCurrency = (value: number | undefined | null) =>
  Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });


//Animate Revenue Change
function useAnimatedNumber(value: number, duration = 400) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let start: number | null = null;
    const initial = display;
    const diff = value - initial;

    function animate(timestamp: number) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      setDisplay(initial + diff * progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [value]);

  return display;
}


export default function Home() {  
 
  const { cafes, selectedCafeId, isLoading: cafesLoading } = useCafe();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [, setLocation] = useLocation();
  const prevUnreadCountRef = useRef<number>(0);

  // Fetch feedbacks and read statuses for toast notifications
  const { data: allCafeFeedbacks } = trpc.feedbacks.allCafes.useQuery(
    undefined,
    {
      refetchInterval: 60000, // Check every minute
      enabled: cafes.length > 0,
    }
  );

  const { data: readStatuses = [] } = trpc.feedbacks.getReadStatuses.useQuery(
    undefined,
    {
      refetchInterval: 60000,
      enabled: cafes.length > 0,
    }
  );

  // Calculate unread feedback count and show toast for new unread feedbacks
  useEffect(() => {
    if (!allCafeFeedbacks || !readStatuses) return;

    const readStatusMap = new Map<string, boolean>();
    readStatuses.forEach((status) => {
      const key = `${status.cafeId}-${status.logId}`;
      readStatusMap.set(key, status.isRead);
    });

    let unreadCount = 0;
    const unreadFeedbacks: Array<{ cafeName: string; subject: string; member: string }> = [];

    allCafeFeedbacks.forEach((cafeFeedback) => {
      cafeFeedback.feedbacks.forEach((feedback: FeedbackLog) => {
        const key = `${cafeFeedback.cafeDbId}-${feedback.log_id}`;
        const isRead = readStatusMap.get(key) || false;
        if (!isRead) {
          unreadCount++;
          if (unreadFeedbacks.length < 2) { // Only show first 2 in toast
            unreadFeedbacks.push({
              cafeName: cafeFeedback.cafeName,
              subject: feedback.subject,
              member: feedback.log_member_account,
            });
          }
        }
      });
    });

    // Show toast only if there are new unread feedbacks
    if (unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current >= 0) {
      const newCount = unreadCount - prevUnreadCountRef.current;
      
      toast(
        <div className="flex items-start gap-3 w-full">
          <MessageSquare className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">
              {newCount} New Feedback{newCount > 1 ? "s" : ""}
            </p>
            {unreadFeedbacks.slice(0, 2).map((fb, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                <span className="font-medium">{fb.cafeName}:</span> {fb.subject.substring(0, 40)}
                {fb.subject.length > 40 ? "..." : ""}
              </p>
            ))}
            {newCount > 2 && (
              <p className="text-sm text-muted-foreground">
                and {newCount - 2} more...
              </p>
            )}
          </div>
        </div>,
        {
          duration: 8000,
          action: {
            label: "View",
            onClick: () => setLocation("/feedbacks"),
          },
        }
      );
    }

    prevUnreadCountRef.current = unreadCount;
  }, [allCafeFeedbacks, readStatuses, setLocation]);

  //Expense Breakdown
  const [expandedExpenses, setExpandedExpenses] = useState<Record<number, boolean>>({});
  const [expandedStaff, setExpandedStaff] = useState<Record<string, boolean>>({});
  const toggleExpense = (cafeId: number) => {
    setExpandedExpenses(prev => ({
      ...prev,
      [cafeId]: !prev[cafeId],
    }));
  };
  const toggleStaff = (cafeId: number, staff: string) => {
    const key = `${cafeId}_${staff}`;
  
    setExpandedStaff(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Refund Breakdown
const [expandedRefunds, setExpandedRefunds] = useState<Record<number, boolean>>({});
const [expandedRefundStaff, setExpandedRefundStaff] = useState<Record<string, boolean>>({});

const toggleRefund = (cafeId: number) => {
  setExpandedRefunds(prev => ({
    ...prev,
    [cafeId]: !prev[cafeId],
  }));
};

const toggleRefundStaff = (cafeId: number, staff: string) => {
  const key = `${cafeId}_${staff}`;
  setExpandedRefundStaff(prev => ({
    ...prev,
    [key]: !prev[key],
  }));
};


  //Fetch yesterday
  const yesterdayRevenueQuery =
  trpc.reports.yesterdayRevenue.useQuery(undefined, {
    enabled: cafes.length > 0,
    refetchInterval: 60000,
  });

  //Product Items
  const [expandedSales, setExpandedSales] =
  useState<Record<number, boolean>>({});

  const toggleSales = (cafeId: number) => {
    setExpandedSales(prev => ({
      ...prev,
      [cafeId]: !prev[cafeId],
    }));
  };

  //Top-ups
  const [expandedTopups, setExpandedTopups] = useState<Record<string, boolean>>({});
  const toggleTopups = (id: string) => {
    setExpandedTopups(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  //Toggle Shifts
  const [expandedShifts, setExpandedShifts] = useState<Record<string, boolean>>({});
  const toggleShift = (key: string) => {
    setExpandedShifts(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  

  const allPcsQuery = trpc.pcs.listAll.useQuery(undefined, {
    enabled: cafes.length > 0,
    refetchInterval: 30000,
  });

  console.log("PCS QUERY STATE:", {
    loading: allPcsQuery.isLoading,
    hasData: !!allPcsQuery.data,
    error: allPcsQuery.error,
  });
  
  

  const todayRevenueQuery = trpc.reports.todayRevenue.useQuery(undefined, {
    enabled: cafes.length > 0,
    refetchInterval: 30000,
  });

  // Fetch refund logs separately to avoid blocking todayRevenue query
  const todayRefundLogsQuery = trpc.reports.todayRefundLogs.useQuery(undefined, {
    enabled: cafes.length > 0,
    refetchInterval: 60000, // Less frequent updates for refund logs
  });

  // Track last updated time
  useEffect(() => {
    if (todayRevenueQuery.dataUpdatedAt) {
      setLastUpdated(new Date(todayRevenueQuery.dataUpdatedAt));
    }
  }, [todayRevenueQuery.dataUpdatedAt]);

  const pcStats = useMemo(() => {
    if (!allPcsQuery.data)
      return {
        totalCafes: 0,
        totalPcs: 0,
        onlinePcs: 0,
        inUsePcs: 0,
        offlinePcs: 0,
        utilizationRate: 0,
      };
  
    const filtered =
      selectedCafeId === "all"
        ? allPcsQuery.data
        : allPcsQuery.data.filter(
            (c) => c.cafeDbId === selectedCafeId
          );
  
    let totalPcs = 0;
    let onlinePcs = 0;
    let inUsePcs = 0;
    let offlinePcs = 0;
  
    filtered.forEach((cafe: any) => {
      totalPcs += cafe.stats?.total || 0;
      onlinePcs += cafe.stats?.online || 0;
      inUsePcs += cafe.stats?.inUse || 0;
      offlinePcs += cafe.stats?.offline || 0;
    });
  
    return {
      totalCafes: filtered.length,
      totalPcs,
      onlinePcs,
      inUsePcs,
      offlinePcs,
      utilizationRate:
        totalPcs > 0
          ? Math.round((inUsePcs / totalPcs) * 100)
          : 0,
    };
  }, [allPcsQuery.data, selectedCafeId]);
  
  

  const revenueStats = useMemo(() => {
    if (!todayRevenueQuery.data) return null;

    const cafesData = todayRevenueQuery.data.cafes;
    const filtered =
      selectedCafeId === "all"
        ? cafesData
        : cafesData.filter((c) => c.cafeDbId === selectedCafeId);        

    // Merge refund logs data with cafe data
    // Convert refundLogsData to Map for O(1) lookups instead of O(n) with .find()
    const refundLogsData = todayRefundLogsQuery.data?.cafes || [];
    const refundLogsMap = new Map(
      refundLogsData.map(r => [r.cafeDbId, r])
    );
    
    const mergedCafes = filtered.map(cafe => {
      const refundData = refundLogsMap.get(cafe.cafeDbId);
      if (refundData && refundData.refundLogs && refundData.refundLogs.length > 0) {
        // Enrich cafe with refund items from refund logs
        const refundItems = refundData.refundLogs.map((log) => {
          const memberInfo = log.member ? `Member: ${log.member} - ` : '';
          const detailsWithMember = `${memberInfo}${log.reason}`;
          return {
            amount: Math.abs(log.amount),
            details: detailsWithMember,
            staff: log.staff,
            member: log.member,
            reason: log.reason,
            time: log.time,
          };
        });
        return { ...cafe, refundItems };
      }
      return cafe;
    });
        
    const combined = {
      totalCash: 0,
      profit: 0,
      salesTotal: 0,
      topups: 0,
      salesCount: 0,
      topupCount: 0,
      refundTotal: 0,
      refundCount: 0,
      expense: 0,
      expenseCount: 0,
    };

    mergedCafes.forEach((cafe) => {
      combined.totalCash += cafe.totalCash;
      combined.profit += cafe.profit;
      combined.salesTotal += cafe.salesTotal;
      combined.topups += cafe.topups;
      combined.salesCount += cafe.salesCount;
      combined.topupCount += cafe.topupCount;
      combined.refundTotal += cafe.refundTotal;
      combined.refundCount += cafe.refundCount;
      combined.expense += cafe.expense || 0;
      combined.expenseCount += cafe.expenseItems?.length || 0;
      
    });

    //Compute difference of sales to yesterday
    const yesterdayCombined =
    yesterdayRevenueQuery.data?.cafes ?? [];

    const yesterdayTotal = yesterdayCombined.reduce(
      (sum: number, c: any) => sum + c.totalCash,
      0
    );

    const diff = combined.totalCash - yesterdayTotal;
    

    return {
      combined,
      diff,
      perCafe: mergedCafes,
      date: todayRevenueQuery.data.date,
    };
  }, [todayRevenueQuery.data, todayRefundLogsQuery.data, selectedCafeId]);

  // Top products start
  const topProducts = useMemo(() => {
    if (!todayRevenueQuery.data) return [];
  
    const cafesData = todayRevenueQuery.data.cafes;
  
    const filtered =
      selectedCafeId === "all"
        ? cafesData
        : cafesData.filter((c) => c.cafeDbId === selectedCafeId);
  
    const map: Record<
      string,
      { name: string; qty: number; total: number }
    > = {};
  
    filtered.forEach((cafe: any) => {
      (cafe.products || []).forEach((p: any) => {
        if (!map[p.name]) {
          map[p.name] = { name: p.name, qty: 0, total: 0 };
        }
  
        map[p.name].qty += p.qty;
        map[p.name].total += p.total;
      });
    });
  
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10); // Top 5 products
  }, [todayRevenueQuery.data, selectedCafeId]);
  // Top products end

  // Top members start
  const topMembers = useMemo(() => {
    if (!todayRevenueQuery.data) return [];
  
    const cafesData = todayRevenueQuery.data.cafes;
    
    const filtered =
      selectedCafeId === "all"
        ? cafesData
        : cafesData.filter(c => c.cafeDbId === selectedCafeId);
  
    const map: Record<string, number> = {};
  
    filtered.forEach((cafe: any) => {
      (cafe.topMembers || []).forEach((m: any) => {
        const amount = Number(m.amount || 0);
        map[m.member] = (map[m.member] || 0) + amount;
      });
    });
  
    return Object.entries(map)
      .map(([member, total]) => ({ member, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [todayRevenueQuery.data, selectedCafeId]);
  // Top members end

  // Top pc start
  const topPCs = useMemo(() => {
    if (!todayRevenueQuery.data) return [];
  
    const cafesData = todayRevenueQuery.data.cafes;
  
    const filtered =
      selectedCafeId === "all"
        ? cafesData
        : cafesData.filter(c => c.cafeDbId === selectedCafeId);
  
    const map: Record<string, number> = {};
  
    filtered.forEach((cafe: any) => {
      (cafe.topPCs || []).forEach((pc: any) => {
        const spend = Number(pc.total_spend || 0);
        map[pc.pc_name] = (map[pc.pc_name] || 0) + spend;
      });
    });
  
    return Object.entries(map)
      .map(([pc, total]) => ({ pc, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [todayRevenueQuery.data, selectedCafeId]);
  // Top pc end

  // Top games start
  const topGames = useMemo(() => {
    if (!todayRevenueQuery.data) return [];
  
    const cafesData = todayRevenueQuery.data.cafes;
  
    const filtered =
      selectedCafeId === "all"
        ? cafesData
        : cafesData.filter(c => c.cafeDbId === selectedCafeId);
  
    const map: Record<string, { game: string; hours: number }> = {};
  
    filtered.forEach((cafe: any) => {
      // When backend provides topGames data (e.g., top_five_games_played), use it here:
      // (cafe.topGames || []).forEach((game: any) => { ... });
      // For now, this will return empty array until backend support is added
      (cafe.topGames || []).forEach((game: any) => {
        if (!map[game.game_name]) {
          map[game.game_name] = { 
            game: game.game_name, 
            hours: 0,
          };
        }
        map[game.game_name].hours += Number(game.hours_played || 0);
      });
    });
  
    return Object.values(map)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [todayRevenueQuery.data, selectedCafeId]);
  // Top games end

  if (cafesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (cafes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Welcome to iCafe Dashboard</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Get started by adding your first internet cafe. Go to Cafe Settings to configure your cafe locations with their API credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {selectedCafeId === "all" ? "All Cafes Overview" : "Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time overview of your internet cafe operations
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className={`h-3 w-3 ${todayRevenueQuery.isFetching ? "animate-spin text-primary" : ""}`} />
          <span>
            Updated {lastUpdated.toLocaleTimeString()} · Auto-refresh 30s
          </span>
        </div>
      </div>

      {/* Today's Revenue - Combined Total */}
      <div>
        <div className="flex items-center gap-2 mb-3">
        <span className="text-base font-semibold leading-none text-emerald-400">₱</span>
          {/*<DollarSign className="h-4 w-4 text-emerald-400" />*/}
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Today's Revenue — {revenueStats?.date || "Loading..."}
          </h2>
          <span className="text-[10px] text-muted-foreground/60">(06:00 AM – 05:59 AM)</span>
          {todayRevenueQuery.isFetching && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-primary border-primary/30">
              LIVE
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <RevenueCard
            title="Total Cash"
            value={revenueStats ? revenueStats.combined.totalCash : null}
            subtitle={
              revenueStats
                ? `${revenueStats.diff >= 0 ? "▲" : "▼"} ${formatCurrency(
                    Math.abs(revenueStats.diff)
                  )} vs yesterday`
                : undefined
            }            
            icon={<span className="text-base font-semibold leading-none">₱</span>}
            color="text-emerald-400"
            bgColor="bg-emerald-400/10"
            loading={todayRevenueQuery.isLoading}
          />
          {/*<RevenueCard
            title="Profit"
            value={revenueStats ? formatCurrency(revenueStats.combined.profit) : null}
            icon={<TrendingUp className="h-4 w-4" />}
            color="text-blue-400"
            bgColor="bg-blue-400/10"
            loading={todayRevenueQuery.isLoading}
          />*/}
          <RevenueCard
            title="Top-ups"
            value={revenueStats ? revenueStats.combined.topups : null}            
            subtitle={
              revenueStats
                ? `${revenueStats.combined.topupCount} top-up${
                    revenueStats.combined.topupCount !== 1 ? "s" : ""
                  }`
                : undefined
            }
            icon={<CreditCard className="h-4 w-4" />}
            color="text-purple-400"
            bgColor="bg-purple-400/10"
            loading={todayRevenueQuery.isLoading}
          />
          <RevenueCard
            title="F&B Sales"
            value={revenueStats ? revenueStats.combined.salesTotal : null}            
            subtitle={
              revenueStats
                ? `${revenueStats.combined.salesCount} order${
                    revenueStats.combined.salesCount !== 1 ? "s" : ""
                  }`
                : undefined
            }
            icon={<ShoppingCart className="h-4 w-4" />}
            color="text-amber-400"
            bgColor="bg-amber-400/10"
            loading={todayRevenueQuery.isLoading}
          />          
          <RevenueCard
            title="Refunds"
            value={revenueStats ? revenueStats.combined.refundTotal : null}            
            subtitle={
              revenueStats
                ? `${revenueStats.combined.refundCount} refund${
                    revenueStats.combined.refundCount !== 1 ? "s" : ""
                  }`
                : undefined
            }
            icon={<ArrowDownRight className="h-4 w-4" />}
            color={revenueStats && revenueStats.combined.refundTotal > 0 ? "text-red-400" : "text-muted-foreground"}
            bgColor={revenueStats && revenueStats.combined.refundTotal > 0 ? "bg-red-400/10" : "bg-secondary/30"}
            loading={todayRevenueQuery.isLoading}
          />
          <RevenueCard
            title="Expenses"
            value={revenueStats ? revenueStats.combined.expense : null}
            subtitle={
              revenueStats
                ? `${revenueStats.combined.expenseCount} expense${
                    revenueStats.combined.expenseCount !== 1 ? "s" : ""
                  }`
                : undefined
            }
            icon={<ArrowDownRight className="h-4 w-4" />}
            color={revenueStats && revenueStats.combined.expense > 0 ? "text-red-400" : "text-red-400"}
            bgColor={revenueStats && revenueStats.combined.expense > 0 ? "bg-orange-400/10" : "bg-secondary/30"}
            loading={todayRevenueQuery.isLoading}
          />
          <Card className="bg-card border-border/50 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
                Top PCs
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-1 max-h-64 overflow-y-auto">              
            {todayRevenueQuery.isLoading && (
              <Skeleton className="h-16 w-full" />
            )}
            
            {!todayRevenueQuery.isLoading &&
              (topPCs.length > 0 ? (
                topPCs.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{i + 1}. {p.pc}</span>
                    <span className="text-cyan-400 font-medium">
                      {formatCurrency(p.total)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No PC usage yet
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
              Top Members
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-1 max-h-64 overflow-y-auto">
          {todayRevenueQuery.isLoading && (
              <Skeleton className="h-16 w-full" />
            )}

            {!todayRevenueQuery.isLoading &&
              (topMembers.length > 0 ? (
              topMembers.map((m, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm text-muted-foreground"
                >
                  <span>
                    {i + 1}. {m.member}
                  </span>
                  <span className="text-purple-400 font-medium">
                    {formatCurrency(m.total)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No top-ups yet
              </div>
            ))}
          </CardContent>
          </Card>
          <Card className="bg-card border-border/50 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Top Selling Products
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-1 max-h-64 overflow-y-auto">
            {todayRevenueQuery.isLoading && (
              <Skeleton className="h-16 w-full" />
            )}

            {!todayRevenueQuery.isLoading &&
              (topProducts.length > 0 ? (
                topProducts.map((p, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm text-muted-foreground"
                  >
                    <span>
                      {i + 1}. {p.name} ({p.qty})
                    </span>
                    <span className="text-amber-400 font-medium">
                      {formatCurrency(p.total)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No product sales yet
                </div>
              ))}
          </CardContent>
          </Card>          
          <Card className="bg-card border-border/50 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-primary" />
                Top Played Games
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-1 max-h-64 overflow-y-auto">
              {todayRevenueQuery.isLoading && (
                <Skeleton className="h-16 w-full" />
              )}

              {!todayRevenueQuery.isLoading &&
                (topGames.length > 0 ? (
                  topGames.map((g, i) => (
                    <div
                      key={g.game}
                      className="flex justify-between text-sm text-muted-foreground"
                    >
                      <span>
                        {i + 1}. {g.game}
                      </span>
                      <span className="text-green-400 font-medium">
                        {g.hours.toFixed(1)}h
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No game data available yet
                  </div>
                ))}
            </CardContent>
          </Card>


        </div>       

      </div>

      

      {/* Per-Cafe Revenue Breakdown */}
      {/*{selectedCafeId === "all" && revenueStats && revenueStats.perCafe.length >= 1 && (*/}
        {revenueStats && revenueStats.perCafe.length >= 1 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Revenue by Cafe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {revenueStats.perCafe.map((cafe) => {

            const staffExpenseMap = (cafe.expenseItems || []).reduce((acc: any, item: any) => {
              if (!acc[item.staff]) {
                acc[item.staff] = { staff: item.staff, total: 0, items: [] };
              }

              acc[item.staff].total += item.amount;
              acc[item.staff].items.push(item);

              return acc;
            }, {});

            const staffExpenseTotals = Object.values(staffExpenseMap)
            .map((row: any) => ({
              ...row,
              items: row.items.sort(
                (a: any, b: any) => b.amount - a.amount
              ),
            }))
            .sort((a: any, b: any) => b.total - a.total);

            //Staff refund
            const staffRefundMap = (cafe.refundItems || []).reduce((acc: any, item: any) => {
              if (!acc[item.staff]) {
                acc[item.staff] = { staff: item.staff, total: 0, items: [] };
              }
            
              acc[item.staff].total += item.amount;
              acc[item.staff].items.push(item);
            
              return acc;
            }, {});
            
            const staffRefundTotals = Object.values(staffRefundMap)
              .map((row: any) => ({
                ...row,
                items: row.items.sort((a: any, b: any) => b.amount - a.amount),
              }))
              .sort((a: any, b: any) => b.total - a.total);
            

            //Product items chad
            const staffSalesMap = (cafe.products || []).reduce(
              (acc: any, item: any) => {
                if (!acc[item.staff]) {
                  acc[item.staff] = {
                    staff: item.staff,
                    total: 0,
                    qty: 0,
                    items: [],
                  };
                }
            
                acc[item.staff].total += item.total;
                acc[item.staff].qty += item.qty;
                acc[item.staff].items.push(item);
            
                return acc;
              },
              {}
            );
            
            const staffSalesTotals = Object.values(staffSalesMap)
              .map((row: any) => ({
                ...row,
                items: row.items.sort(
                  (a: any, b: any) => b.total - a.total
                ),
              }))
              .sort((a: any, b: any) => b.total - a.total);
            


            return (
              <Card key={cafe.cafeDbId} className="bg-card border-border/50 overflow-hidden">

                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {cafe.cafeName}
                    </CardTitle>
                    {!cafe.success && (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                        API Error
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cafe.success ? (
                    <>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-emerald-400">
                          {formatCurrency(cafe.totalCash)}
                        </span>
                        <span className="text-xs text-muted-foreground">Total Cash</span>
                      </div>
                      {/* Per-Shift Breakdown */}
                      {cafe.shifts && cafe.shifts.length > 0 && (
                        <div className="space-y-1.5 py-2 border-y border-border/30">
                          <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Shifts</h4>
                          {cafe.shifts.map((shift: any, idx: number) => {
                            const startTime = shift.startTime ? shift.startTime.split(' ')[1]?.substring(0, 5) : '-';
                            const endTime = shift.endTime && shift.endTime !== '-' ? shift.endTime.split(' ')[1]?.substring(0, 5) : 'Active';

                            const shiftKey = `${cafe.cafeDbId}-${idx}`;
                            const expanded = expandedShifts[shiftKey];

                            
                            // Determine shift type based on start time
                            let shiftType = 'AM';
                            let badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                            if (startTime !== '-') {
                              const [hours] = startTime.split(':').map(Number);
                              if (hours >= 16 && hours < 24) {
                                shiftType = 'PM';
                                badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                              } else if (hours >= 0 && hours < 6) {
                                shiftType = 'GY';
                                badgeColor = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                              }
                            }
                            
                            return (
                              <div key={idx} className="bg-secondary/20 rounded px-2 py-1.5 text-xs">

                                  {/* Shift header */}
                                  <div
                                    className="flex items-center justify-between cursor-pointer hover:bg-secondary/30 rounded px-1"
                                    onClick={() => toggleShift(shiftKey)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] px-1.5 py-0 h-4 ${badgeColor}`}
                                      >
                                        {shiftType}
                                      </Badge>

                                      <span className="font-medium text-foreground">
                                        {shift.staffName}
                                      </span>

                                      <span className="text-[10px] text-muted-foreground">
                                        {startTime} – {endTime}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-emerald-400">
                                        {formatCurrency(shift.totalCash)}
                                      </span>

                                      <span className="text-muted-foreground text-xs">
                                        {expanded ? "▼" : "▶"}
                                      </span>
                                    </div>
                                  </div>


                                  {/* Metrics */}
                                  {expanded && (
                                    <div className="mt-2 space-y-1 text-[10px]">
                                      <div className="flex justify-between">
                                      <span className="text-muted-foreground">Projected Revenue</span>
                                      <span className="font-medium text-emerald-400">
                                        {formatCurrency(shift.projectedRevenue)}
                                      </span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Avg Revenue</span>
                                      <span className="font-medium">
                                        {formatCurrency(shift.revenuePerHour)}
                                      </span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Avg Top-up</span>
                                      <span className="font-medium">
                                        {formatCurrency(shift.avgTopup)}
                                      </span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Avg F&B</span>
                                      <span className="font-medium">
                                        {formatCurrency(shift.salesPerHour)}
                                      </span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Avg Occupancy</span>
                                      <span className="font-medium">{shift.occupancy}%</span>
                                    </div>
                                    </div>
                                  )}

                                                                    

                                    

                                  
                                </div>

                            );
                          })}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">

                        {/* Row 1 */}
                        {/*<div className="col-span-2 flex justify-between">
                          <span className="text-muted-foreground">Profit</span>
                          <span className="text-blue-400 font-medium">
                            {formatCurrency(cafe.profit)}
                          </span>
                        </div>*/}                       

                        {/* Row 2 */}
                        {/* <div className="col-span-2 flex justify-between">
                          <span className="text-muted-foreground">Top-ups</span>
                          <span className="text-purple-400 font-medium">
                            {formatCurrency(cafe.topups)}
                          </span>
                        </div> */}
                        <div
                          className="col-span-2 flex justify-between cursor-pointer hover:bg-secondary/30"
                          onClick={() => toggleTopups(cafe.cafeDbId)}
                        >
                          <span className="text-muted-foreground flex gap-1 items-center">
                            Top-ups
                            <span className="text-xs opacity-70">
                              ({cafe.topupCount})
                            </span>

                            <span className="text-xs">
                              {expandedTopups[cafe.cafeDbId] ? "▼" : "▶"}
                            </span>
                          </span>

                          <span className="text-purple-400 font-medium">
                            {formatCurrency(cafe.topups)}
                          </span>
                        </div>

                        {expandedTopups[cafe.cafeDbId] &&
                          (cafe.topupsByStaff || []).map((staff: any, idx: number) => (
                            <div
                              key={idx}
                              className="col-span-2 pl-6 flex justify-between text-sm"
                            >
                              <span className="text-xs font-medium text-foreground">
                                {staff.name} ({staff.count})
                              </span>

                              <span className="text-xs text-purple-400">
                                {formatCurrency(staff.total)}
                              </span>
                            </div>
                          ))}
                          
                        <div></div> {/* Empty column to keep grid alignment */}

                        {/* Row 3 */}
                        {/*<div className="col-span-2 flex justify-between">
                          <span className="text-muted-foreground">Product Sales</span>
                          <span className="text-amber-400 font-medium">
                            {formatCurrency(cafe.salesTotal)}
                          </span>
                        </div>*/}
                        <div
                          className="col-span-2 flex justify-between cursor-pointer hover:bg-secondary/30"
                          onClick={() => toggleSales(cafe.cafeDbId)}
                        >
                          <span className="text-muted-foreground flex gap-1 items-center">
                            F&B Sales
                            <span className="text-[10px] text-muted-foreground/70">
                              (
                              {(cafe.products || []).reduce(
                                (sum: number, p: any) => sum + (p.qty || 0),
                                0
                              )}
                              )
                            </span>

                            <span className="text-xs">
                              {expandedSales[cafe.cafeDbId] ? "▼" : "▶"}
                            </span>
                          </span>

                          <span className="text-amber-400 font-medium">
                            {formatCurrency(cafe.salesTotal)}
                          </span>
                        </div>

                        {expandedSales[cafe.cafeDbId] &&
                          staffSalesTotals.map((row: any, idx: number) => (
                            <div key={idx} className="col-span-2">
                              <div className="flex justify-between pl-12 text-xs font-medium">
                                <span>{row.staff} ({row.qty})</span>
                                <span className="text-amber-400">
                                  {formatCurrency(row.total)}
                                </span>
                              </div>

                              {row.items.map((item: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex justify-between pl-16 text-xs text-muted-foreground"
                                >
                                  <span>
                                    • {item.name} ({item.qty})
                                  </span>

                                  <span className="text-amber-400">
                                    {formatCurrency(item.total)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}



                        <div></div> {/* Empty column */}

                        {/* Row 4 */}
                        <div
                          className="col-span-2 flex justify-between pt-1 border-t border-border/30 cursor-pointer hover:bg-secondary/30"
                          onClick={() => toggleRefund(cafe.cafeDbId)}
                        >
                          <span className="text-muted-foreground flex items-center gap-1">
                            Refunds
                            {(cafe.refundItems?.length ?? 0) > 0 && (
                              <span className="text-[10px] text-muted-foreground/70">
                                ({cafe.refundItems.length})
                              </span>
                            )}
                            <span className="text-xs">
                              {expandedRefunds[cafe.cafeDbId] ? "▼" : "▶"}
                            </span>
                          </span>

                          <span className={cafe.refundTotal > 0 ? "text-red-400 font-medium" : "text-muted-foreground"}>
                            {formatCurrency(cafe.refundTotal)}
                          </span>
                        </div>

                        {expandedRefunds[cafe.cafeDbId] &&
                        staffRefundTotals.map((row: any, idx: number) => {
                          const staffKey = `${cafe.cafeDbId}_${row.staff}`;
                          const isExpanded = expandedRefundStaff[staffKey];

                          return (
                            <div key={idx} className="col-span-2">
                              {/* Staff Row */}
                              <div
                                className="flex justify-between pl-12 text-xs cursor-pointer"
                                onClick={() => toggleRefundStaff(cafe.cafeDbId, row.staff)}
                              >
                                <span className="font-medium text-muted-foreground flex gap-1">
                                  {isExpanded ? "▼" : "▶"} {row.staff}
                                  <span className="text-[10px] text-muted-foreground/70">
                                    ({row.items.length} item{row.items.length !== 1 ? "s" : ""})
                                  </span>
                                </span>

                                <span className="text-red-400">
                                  {formatCurrency(row.total)}
                                </span>
                              </div>

                              {/* Items */}
                              {isExpanded &&
                                row.items.map((item: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex justify-between pl-16 text-xs text-muted-foreground"
                                  >
                                    <span className="flex gap-2">
                                      <span className="opacity-50">•</span>
                                      {item.details}
                                    </span>

                                    <span className="text-red-400">
                                      {formatCurrency(item.amount)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          );
                        })}


                          <div
                            className="col-span-2 flex justify-between cursor-pointer hover:bg-secondary/30"
                            onClick={() => toggleExpense(cafe.cafeDbId)}
                          >
                          <span className="text-muted-foreground flex items-center gap-1">
                            Expenses
                            {(cafe.expenseItems?.length ?? 0) > 0 && (
                              <span className="text-[10px] text-muted-foreground/70">
                                ({cafe.expenseItems.length})
                              </span>
                            )}
                            <span className="text-xs">
                              {expandedExpenses[cafe.cafeDbId] ? "▼" : "▶"}
                            </span>
                          </span>


                          <span className={cafe.expense > 0 ? "text-red-400 font-medium" : "text-muted-foreground"}>
                            {formatCurrency(cafe.expense)}
                          </span>
                        </div>

                        {expandedExpenses[cafe.cafeDbId] &&
                          staffExpenseTotals.map((row: any, idx: number) => {
                            const staffKey = `${cafe.cafeDbId}_${row.staff}`;
                            const isExpanded = expandedStaff[staffKey];

                            return (
                              <div key={idx} className="col-span-2">
                                {/* Staff row */}
                                <div
                                  className="flex justify-between pl-12 text-xs cursor-pointer"
                                  onClick={() => toggleStaff(cafe.cafeDbId, row.staff)}
                                >
                                  <span className="font-medium text-muted-foreground flex gap-1">
                                    {isExpanded ? "▼" : "▶"} {row.staff}

                                    <span className="text-[10px] text-muted-foreground/70">
                                      ({row.items.length} item{row.items.length !== 1 ? "s" : ""})
                                    </span>

                                  </span>


                                  <span className="text-red-400">
                                    {formatCurrency(row.total)}
                                  </span>
                                </div>

                                {/* Items */}
                                {isExpanded &&
                                  row.items.map((item: any, i: number) => (
                                    <div
                                      key={i}
                                      className="flex justify-between pl-16 text-xs text-muted-foreground"
                                    >
                                      <span className="flex gap-2">
                                        <span className="opacity-50">•</span>
                                        {item.details}
                                      </span>

                                      <span className="text-red-400">
                                        {formatCurrency(item.amount)}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            );
                          })}

                      </div>

                      <div className="flex gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                        <span>{cafe.salesCount} orders</span>
                        <span>·</span>
                        <span>{cafe.topupCount} top-ups</span>
                        {cafe.refundCount > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-red-400">{cafe.refundCount} refunds</span>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{cafe.error || "Failed to fetch revenue data"}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              )})}
          </div>
        </div>
      )}

      {/* PC Status Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          PC Status
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total PCs"
            value={pcStats?.totalPcs ?? "-"}
            icon={<Monitor className="h-4 w-4" />}
            description={`Across ${pcStats?.totalCafes ?? 0} cafe${(pcStats?.totalCafes ?? 0) !== 1 ? "s" : ""}`}
            color="text-primary"
          />
          {/*<StatCard
            title="Online"
            value={pcStats?.onlinePcs ?? "-"}
            icon={<Wifi className="h-4 w-4" />}
            description="PCs currently online"
            color="text-emerald-400"
          />*/}
          <StatCard
            title="In Use"
            value={pcStats?.inUsePcs ?? "-"}
            icon={<Zap className="h-4 w-4" />}
            description={`${pcStats?.utilizationRate ?? 0}% utilization`}
            color="text-amber-400"
          />
          <StatCard
            title="Available PCs"
            value={pcStats?.offlinePcs ?? "-"}
            icon={<WifiOff className="h-4 w-4" />}
            description="PCs free to use"
            color="text-red-400"
          />
        </div>
      </div>

      {/* Cafe Breakdown */}
      {selectedCafeId === "all" && allPcsQuery.data && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            PC Status by Cafe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allPcsQuery.data.map((cafe) => {
              const total = cafe.stats?.total || 0;
              const inUse = cafe.stats?.inUse || 0;
              const available = cafe.stats?.offline || 0;
              const utilization = total > 0 ? Math.round((inUse / total) * 100) : 0;


              return (
                <Card key={cafe.cafeDbId} className="bg-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {cafe.cafeName}
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                  <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total PCs: {total}
                  </span>

                  <span className="text-emerald-400">
                    Available: {available}
                  </span>

                  <span className="text-amber-400">
                    In Use: {inUse}
                  </span>

                  <span className="text-primary font-medium">
                    Utilization: {utilization}%
                  </span>
                </div>


                    {total > 0 && (
                      <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all"
                          style={{ width: `${(inUse / total) * 100}%` }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {allPcsQuery.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {allPcsQuery.isError && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Failed to load PC data. Check your API credentials in Cafe Settings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RevenueCard({
  title,
  value,
  subtitle,
  icon,
  color,
  bgColor,
  loading,
}: {
  title: string;
  //value: string | null;
  value: number | null;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  loading: boolean;
}) {

  const animatedValue = useAnimatedNumber(value ?? 0);

  if (loading) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="pt-5">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-28" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50 hover:border-border/80 transition-colors">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className={`${bgColor} ${color} p-1.5 rounded-md`}>{icon}</div>
        </div>       

        <p className={`text-2xl font-bold ${color}`}>
          {value !== null ? formatCurrency(animatedValue) : "—"}
        </p>

        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  color: string;
}) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={color}>{icon}</div>
        </div>
        <p className="text-3xl font-bold mt-2 text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
