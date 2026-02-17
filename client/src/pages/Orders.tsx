import { useCafe } from "@/contexts/CafeContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Orders() {
  const { cafes, selectedCafeId } = useCafe();
  const activeCafeId = selectedCafeId === "all" ? cafes[0]?.id : selectedCafeId;

  const ordersQuery = trpc.orders.list.useQuery(
    { cafeDbId: activeCafeId || 0 },
    { enabled: !!activeCafeId }
  );

  const billingQuery = trpc.billing.logs.useQuery(
    { cafeDbId: activeCafeId || 0 },
    { enabled: !!activeCafeId }
  );

  if (cafes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Add a cafe in Settings to view orders</p>
      </div>
    );
  }

  const orders = (ordersQuery.data as any)?.data;
  const orderList = Array.isArray(orders?.items) ? orders.items : Array.isArray(orders) ? orders : [];

  const billing = (billingQuery.data as any)?.data;
  const billingList = Array.isArray(billing?.items) ? billing.items : Array.isArray(billing) ? billing : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orders & Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View orders and billing logs
        </p>
      </div>

      {selectedCafeId === "all" && cafes.length > 1 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">
              Showing data from <strong className="text-foreground">{cafes.find(c => c.id === activeCafeId)?.name}</strong>.
              Switch to a specific cafe to view its orders.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : orderList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No orders found</div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead className="text-xs">Order ID</TableHead>
                    <TableHead className="text-xs">Member</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderList.slice(0, 50).map((order: any, idx: number) => (
                    <TableRow key={order.order_id || idx} className="hover:bg-secondary/20">
                      <TableCell className="text-sm font-medium">
                        #{order.order_id || order.id || idx + 1}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.member_account || order.member_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.order_amount !== undefined ? `$${order.order_amount}` : order.amount !== undefined ? `$${order.amount}` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {order.order_status || order.status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.created_at || order.order_date || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Billing Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {billingQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : billingList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No billing logs found</div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead className="text-xs">PC</TableHead>
                    <TableHead className="text-xs">Member</TableHead>
                    <TableHead className="text-xs">Duration</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingList.slice(0, 50).map((log: any, idx: number) => (
                    <TableRow key={log.id || idx} className="hover:bg-secondary/20">
                      <TableCell className="text-sm font-medium">
                        {log.pc_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.member_account || log.member_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.duration || log.total_time || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.amount !== undefined ? `$${log.amount}` : log.total_amount !== undefined ? `$${log.total_amount}` : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.created_at || log.date || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
