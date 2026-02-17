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
import { Package, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function Products() {
  const { cafes, selectedCafeId } = useCafe();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const activeCafeId = selectedCafeId === "all" ? cafes[0]?.id : selectedCafeId;

  const productsQuery = trpc.products.list.useQuery(
    {
      cafeDbId: activeCafeId || 0,
      search: search || undefined,
      page,
      sort: "desc",
    },
    { enabled: !!activeCafeId }
  );

  const groupsQuery = trpc.products.groups.useQuery(
    { cafeDbId: activeCafeId || 0 },
    { enabled: !!activeCafeId }
  );

  if (cafes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Add a cafe in Settings to manage products</p>
      </div>
    );
  }

  const products = (productsQuery.data as any)?.data;
  const productList = Array.isArray(products?.items) ? products.items : Array.isArray(products) ? products : [];
  const groups = (groupsQuery.data as any)?.data;
  const groupList = Array.isArray(groups?.items) ? groups.items : Array.isArray(groups) ? groups : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Products</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage products and pricing for your cafes
        </p>
      </div>

      {selectedCafeId === "all" && cafes.length > 1 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">
              Showing products from <strong className="text-foreground">{cafes.find(c => c.id === activeCafeId)?.name}</strong>.
              Switch to a specific cafe to manage its products.
            </p>
          </CardContent>
        </Card>
      )}

      {groupList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groupList.map((group: any) => (
            <Badge key={group.product_group_id} variant="secondary" className="text-xs">
              {group.product_group_name}
            </Badge>
          ))}
        </div>
      )}

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-sm font-medium">Product List</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
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
          {productsQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : productList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products found
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30">
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Group</TableHead>
                      <TableHead className="text-xs">Price</TableHead>
                      <TableHead className="text-xs">Stock</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productList.map((product: any, idx: number) => (
                      <TableRow key={product.product_id || idx} className="hover:bg-secondary/20">
                        <TableCell className="text-sm font-medium">
                          {product.product_name || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.product_group_name || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {product.product_price !== undefined ? `$${product.product_price}` : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {product.product_stock !== undefined ? product.product_stock : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={product.product_enable === 1 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {product.product_enable === 1 ? "Active" : "Inactive"}
                          </Badge>
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
                    disabled={productList.length < 20}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
