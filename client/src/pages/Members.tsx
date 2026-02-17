import { useCafe } from "@/contexts/CafeContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function Members() {
  const { cafes, selectedCafeId } = useCafe();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [detailCafeId, setDetailCafeId] = useState<number | null>(null);

  const activeCafeId = selectedCafeId === "all" ? cafes[0]?.id : selectedCafeId;

  const membersQuery = trpc.members.list.useQuery(
    {
      cafeDbId: activeCafeId || 0,
      search: search || undefined,
      page,
      limit: 20,
    },
    { enabled: !!activeCafeId }
  );

  const memberDetailQuery = trpc.members.details.useQuery(
    {
      cafeDbId: detailCafeId || 0,
      memberId: selectedMember?.member_id || 0,
    },
    { enabled: !!selectedMember && !!detailCafeId }
  );

  const balanceHistoryQuery = trpc.members.balanceHistory.useQuery(
    {
      cafeDbId: detailCafeId || 0,
      memberId: selectedMember?.member_id || 0,
    },
    { enabled: !!selectedMember && !!detailCafeId }
  );

  if (cafes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Users className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Add a cafe in Settings to manage members</p>
      </div>
    );
  }

  const members = (membersQuery.data as any)?.data;
  const memberList = Array.isArray(members?.items) ? members.items : Array.isArray(members) ? members : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage member accounts and view their information
        </p>
      </div>

      {selectedCafeId === "all" && cafes.length > 1 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">
              Showing members from <strong className="text-foreground">{cafes.find(c => c.id === activeCafeId)?.name}</strong>.
              Switch to a specific cafe to view its members.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-sm font-medium">Member List</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-secondary/50 border-border/50 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {membersQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : memberList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30">
                      <TableHead className="text-xs">Account</TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Group</TableHead>
                      <TableHead className="text-xs">Balance</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberList.map((member: any, idx: number) => (
                      <TableRow key={member.member_id || idx} className="hover:bg-secondary/20">
                        <TableCell className="text-sm font-medium">
                          {member.member_account || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {member.member_name || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.member_group_name || member.group_name || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {member.member_balance !== undefined ? `$${member.member_balance}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={member.member_enable === 1 || member.enable === 1 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {member.member_enable === 1 || member.enable === 1 ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setSelectedMember(member);
                              setDetailCafeId(activeCafeId || null);
                            }}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">Page {page}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={memberList.length < 20}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {memberDetailQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Account</p>
                  <p className="font-medium">{selectedMember?.member_account || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="font-medium">{selectedMember?.member_name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Balance</p>
                  <p className="font-medium">${selectedMember?.member_balance ?? "0"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Group</p>
                  <p className="font-medium">{selectedMember?.member_group_name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{selectedMember?.member_email || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium">{selectedMember?.member_phone || "-"}</p>
                </div>
              </div>

              {balanceHistoryQuery.data && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Recent Balance History</h4>
                  <div className="max-h-48 overflow-y-auto rounded border border-border/50">
                    {Array.isArray((balanceHistoryQuery.data as any)?.data)
                      ? (balanceHistoryQuery.data as any).data.slice(0, 10).map((entry: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-3 py-2 text-xs border-b border-border/30 last:border-0"
                          >
                            <span className="text-muted-foreground">
                              {entry.created_at || entry.date || "-"}
                            </span>
                            <span className="font-medium">
                              {entry.amount > 0 ? "+" : ""}
                              {entry.amount ?? entry.balance_change ?? "-"}
                            </span>
                          </div>
                        ))
                      : (
                        <p className="text-xs text-muted-foreground p-3">No history available</p>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
