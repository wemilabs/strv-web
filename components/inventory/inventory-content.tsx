import { Package, TrendingDown, TrendingUp } from "lucide-react";
import { cacheLife } from "next/cache";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPriceInRWF } from "@/lib/utils";
import { getInventoryList } from "@/server/inventory";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";

export async function InventoryContent({
  activeOrgId,
}: {
  activeOrgId: string;
}) {
  "use cache: private";
  cacheLife("seconds");

  const result = await getInventoryList({ organizationId: activeOrgId });

  if (!result.ok) {
    return (
      <div className="text-center text-red-600">
        Error loading inventory:{" "}
        {typeof result.error === "string"
          ? result.error
          : "Failed to load inventory"}
      </div>
    );
  }

  const products = result.products;
  const lowStockProducts = products.filter(
    p => p.currentStock > 0 && p.currentStock <= p.lowStockThreshold,
  );
  const outOfStockProducts = products.filter(p => p.currentStock === 0);
  const totalValue = products.reduce(
    (sum, p) => sum + Number(p.price) * p.currentStock,
    0,
  );

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono tracking-tighter">
              Total Products
            </CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tighter">
              {products.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono tracking-tighter">
              Low Stock
            </CardTitle>
            <TrendingDown className="size-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 font-mono tracking-tighter">
              {lowStockProducts.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono tracking-tighter">
              Out of Stock
            </CardTitle>
            <TrendingDown className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 font-mono tracking-tighter">
              {outOfStockProducts.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono tracking-tighter">
              Total Value
            </CardTitle>
            <TrendingUp className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 font-mono tracking-tighter">
              {formatPriceInRWF(totalValue.toString())}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-6 border-b">
          <h2 className="text-xl font-medium">Products</h2>
          <p className="text-sm text-muted-foreground font-mono tracking-tighter">
            These are all products with inventory tracking enabled
          </p>
        </div>

        {products.length === 0 ? (
          <Empty className="min-h-[400px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No products with inventory tracking</EmptyTitle>
              <EmptyDescription className="font-mono tracking-tighter">
                Enable inventory tracking when creating or editing products
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <InventoryTable products={products} organizationId={activeOrgId} />
        )}
      </div>
    </>
  );
}
