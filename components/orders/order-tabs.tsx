"use client";

import { ShoppingBag, Store } from "lucide-react";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  // EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Order, OrderItem } from "@/db/schema";
import { ORDER_STATUS_VALUES } from "@/lib/constants";
import { OrderList } from "./order-list";
import { OrderStats } from "./order-stats";

type OrderWithUser = Order & {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  };
  orderItems: (OrderItem & {
    product: {
      id: string;
      name: string;
      imageUrls: string[] | null;
      price: string;
    };
  })[];
};

type OrderWithOrganization = Order & {
  user?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  };
  orderItems: (OrderItem & {
    product: {
      id: string;
      name: string;
      imageUrls: string[] | null;
      price: string;
    };
  })[];
};

interface OrderTabsProps {
  myOrders: OrderWithOrganization[];
  customerOrders: OrderWithUser[];
  merchantStats: {
    status: string;
    count: number;
    totalRevenue: string | null;
  }[];
}

export function OrderTabs({
  myOrders,
  customerOrders,
  merchantStats,
}: OrderTabsProps) {
  const myOrdersStats = calculateOrderStats(myOrders);

  return (
    <Tabs defaultValue="my-orders" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
        <TabsTrigger value="my-orders" className="gap-1.5">
          <ShoppingBag className="size-4" />
          Mine
          {myOrders.length > 0 && (
            <Badge variant="secondary">{myOrders.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="customer-orders" className="gap-1.5">
          <Store className="size-4" />
          From Customers
          {customerOrders.length > 0 && (
            <Badge variant="secondary">{customerOrders.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="my-orders" className="space-y-6 mt-6">
        {myOrders.length > 0 ? (
          <>
            <OrderStats stats={myOrdersStats} />
            <Suspense
              fallback={
                <div className="text-center text-muted-foreground font-mono tracking-tighter">
                  Loading orders...
                </div>
              }
            >
              <OrderList orders={myOrders} variant="customer" />
            </Suspense>
          </>
        ) : (
          <Empty className="min-h-[300px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingBag className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No personal orders</EmptyTitle>
              <EmptyDescription className="font-mono tracking-tighter">
                You haven&apos;t placed any orders yet. Start shopping from
                stores to see your order history here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </TabsContent>

      <TabsContent value="customer-orders" className="space-y-6 mt-6">
        {customerOrders.length > 0 ? (
          <>
            <OrderStats stats={merchantStats} />
            <Suspense
              fallback={
                <div className="text-center text-muted-foreground font-mono tracking-tighter">
                  Loading orders...
                </div>
              }
            >
              <OrderList orders={customerOrders} variant="merchant" />
            </Suspense>
          </>
        ) : (
          <Empty className="min-h-[300px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Store className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No customer orders yet</EmptyTitle>
              <EmptyDescription className="font-mono tracking-tighter">
                When customers place orders from your store, they will appear
                here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </TabsContent>
    </Tabs>
  );
}

function calculateOrderStats(orders: OrderWithOrganization[]) {
  const statusCounts = orders.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return ORDER_STATUS_VALUES.map(status => ({
    status,
    count: statusCounts[status] || 0,
    totalRevenue:
      orders
        .filter(o => o.status === status)
        .reduce((sum, o) => sum + parseFloat(o.totalPrice), 0)
        .toString() || "0",
  }));
}
