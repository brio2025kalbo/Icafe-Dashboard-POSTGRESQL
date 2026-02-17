import { useCafe } from "@/contexts/CafeContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Monitor,
  Power,
  RotateCcw,
  AlertTriangle,
  MoreVertical,
  Building2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useMemo, useState } from "react";

function getPcStatus(pc: any): "online" | "in-use" | "offline" | "out-of-order" {
  if (pc.pc_out_of_order === 1 || pc.out_of_order === 1) return "out-of-order";
  const s = (pc.pc_status || pc.status || "").toString().toLowerCase();
  if (s === "in use" || s === "inuse" || s === "busy" || pc.member_account) return "in-use";
  if (s === "online" || s === "available" || s === "ready" || s === "free") return "online";
  return "offline";
}

const statusColors: Record<string, string> = {
  "online": "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
  "in-use": "bg-amber-500/20 border-amber-500/40 text-amber-400",
  "offline": "bg-zinc-500/20 border-zinc-500/40 text-zinc-500",
  "out-of-order": "bg-red-500/20 border-red-500/40 text-red-400",
};

const statusDotColors: Record<string, string> = {
  "online": "bg-emerald-400",
  "in-use": "bg-amber-400",
  "offline": "bg-zinc-500",
  "out-of-order": "bg-red-400",
};

export default function PcStatus() {
  const { cafes, selectedCafeId } = useCafe();

  const allPcsQuery = trpc.pcs.listAll.useQuery(undefined, {
    enabled: cafes.length > 0,
    refetchInterval: 15000,
  });

  const sendCommandMut = trpc.pcs.sendCommand.useMutation({
    onSuccess: () => {
      toast.success("Command sent successfully");
      allPcsQuery.refetch();
    },
    onError: () => toast.error("Failed to send command"),
  });

  const setOOOMut = trpc.pcs.setOutOfOrder.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      allPcsQuery.refetch();
    },
    onError: () => toast.error("Failed to update status"),
  });

  const [filter, setFilter] = useState<string>("all");

  const cafeData = useMemo(() => {
    if (!allPcsQuery.data) return [];
    return selectedCafeId === "all"
      ? allPcsQuery.data
      : allPcsQuery.data.filter((c) => c.cafeDbId === selectedCafeId);
  }, [allPcsQuery.data, selectedCafeId]);

  const handleReboot = (cafeDbId: number, pcName: string) => {
    sendCommandMut.mutate({
      cafeDbId,
      command: {
        action: "power",
        target: "boot",
        data: { power_type: "reboot", ids: [] },
      },
    });
  };

  const handleShutdown = (cafeDbId: number, pcName: string) => {
    sendCommandMut.mutate({
      cafeDbId,
      command: {
        action: "power",
        target: "boot",
        data: { power_type: "shutdown", ids: [] },
      },
    });
  };

  const handleToggleOOO = (cafeDbId: number, pcName: string, currentOOO: boolean) => {
    setOOOMut.mutate({
      cafeDbId,
      pcNames: [pcName],
      outOfOrder: currentOOO ? 0 : 1,
    });
  };

  if (cafes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Monitor className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Add a cafe in Settings to view PC status</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">PC Status</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor and control PCs across your cafes</p>
        </div>
        <div className="flex items-center gap-2">
          {["all", "online", "in-use", "offline", "out-of-order"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize text-xs"
            >
              {f === "all" ? "All" : f}
            </Button>
          ))}
        </div>
      </div>

      {allPcsQuery.isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {[...Array(24)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {cafeData.map((cafe) => {
        const pcs = Array.isArray(cafe.pcs) ? cafe.pcs : [];
        const filteredPcs = filter === "all" ? pcs : pcs.filter((pc: any) => getPcStatus(pc) === filter);

        return (
          <Card key={cafe.cafeDbId} className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {cafe.cafeName}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {pcs.length} PCs
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPcs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No PCs match the current filter
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2">
                  {filteredPcs.map((pc: any, idx: number) => {
                    const status = getPcStatus(pc);
                    const pcName = pc.pc_name || pc.name || `PC${idx + 1}`;
                    const isOOO = pc.pc_out_of_order === 1 || pc.out_of_order === 1;

                    return (
                      <Tooltip key={pcName + idx}>
                        <TooltipTrigger asChild>
                          <div className="relative group">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className={`w-full aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 ${statusColors[status]}`}
                                >
                                  <Monitor className="h-4 w-4" />
                                  <span className="text-[10px] font-medium truncate max-w-full px-1">
                                    {pcName}
                                  </span>
                                  <div className={`h-1.5 w-1.5 rounded-full ${statusDotColors[status]}`} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-40">
                                <DropdownMenuItem onClick={() => handleReboot(cafe.cafeDbId, pcName)}>
                                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                  Reboot
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShutdown(cafe.cafeDbId, pcName)}>
                                  <Power className="mr-2 h-3.5 w-3.5" />
                                  Shutdown
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleOOO(cafe.cafeDbId, pcName, isOOO)}>
                                  <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                                  {isOOO ? "Clear OOO" : "Set Out of Order"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1">
                            <p className="font-medium">{pcName}</p>
                            <p className="capitalize">Status: {status}</p>
                            {pc.member_account && <p>User: {pc.member_account}</p>}
                            {pc.pc_group_name && <p>Group: {pc.pc_group_name}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
