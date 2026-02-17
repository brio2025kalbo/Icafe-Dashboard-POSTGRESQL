import { useCafe } from "@/contexts/CafeContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, Zap, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export default function Sessions() {
  const { cafes, selectedCafeId } = useCafe();

  const allPcsQuery = trpc.pcs.listAll.useQuery(undefined, {
    enabled: cafes.length > 0,
    refetchInterval: 15000,
  });

  const activeSessions = useMemo(() => {
    if (!allPcsQuery.data) return [];

    const filtered =
      selectedCafeId === "all"
        ? allPcsQuery.data
        : allPcsQuery.data.filter((c) => c.cafeDbId === selectedCafeId);

    const sessions: any[] = [];
    filtered.forEach((cafe) => {
      const pcs = Array.isArray(cafe.pcs) ? cafe.pcs : [];
      pcs.forEach((pc: any) => {
        const s = (pc.pc_status || pc.status || "").toString().toLowerCase();
        if (s === "in use" || s === "inuse" || s === "busy" || pc.member_account) {
          sessions.push({
            ...pc,
            cafeName: cafe.cafeName,
            cafeDbId: cafe.cafeDbId,
          });
        }
      });
    });
    return sessions;
  }, [allPcsQuery.data, selectedCafeId]);

  if (cafes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Zap className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Add a cafe in Settings to monitor sessions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Active Sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeSessions.length} active session{activeSessions.length !== 1 ? "s" : ""} across your cafes
        </p>
      </div>

      {allPcsQuery.isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {activeSessions.length === 0 && !allPcsQuery.isLoading && (
        <Card className="bg-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Zap className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">No active sessions at the moment</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {activeSessions.map((session: any, idx: number) => {
          const pcName = session.pc_name || session.name || `PC${idx}`;
          const memberAccount = session.member_account || "Guest";
          const memberName = session.member_name || memberAccount;
          const startTime = session.pc_start_time || session.start_time;
          const groupName = session.pc_group_name || session.group_name || "-";
          const balance = session.member_balance ?? session.balance;

          return (
            <Card key={`${session.cafeDbId}-${pcName}-${idx}`} className="bg-card border-border/50">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{memberName}</span>
                      <Badge variant="secondary" className="text-xs">{pcName}</Badge>
                      {selectedCafeId === "all" && (
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          {session.cafeName}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {startTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Started: {startTime}
                        </span>
                      )}
                      <span>Group: {groupName}</span>
                      {balance !== undefined && balance !== null && (
                        <span>Balance: {balance}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
