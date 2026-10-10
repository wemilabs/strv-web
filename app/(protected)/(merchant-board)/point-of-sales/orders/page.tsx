import { Lock, ScrollText, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { OrdersPageSkeleton } from "@/components/orders/order-skeleton";
import { OrderTabs } from "@/components/orders/order-tabs";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  getOrderStats,
  getOrdersByOrganization,
  getOrdersByUser,
} from "@/data/orders";
import { verifySession } from "@/data/user-session";
import { APP_URL, GENERAL_BRANDING_IMG_URL } from "@/lib/constants";

async function OrdersContent() {
  const sessionData = await verifySession();

  if (!sessionData.success || !sessionData.session)
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lock className="size-6" />
          </EmptyMedia>
          <EmptyTitle>You are not yet signed in</EmptyTitle>
          <EmptyDescription className="font-mono tracking-tighter">
            Sign in first to access this service
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm" className="w-full">
            <Link href="/sign-in">
              <span>Sign In</span>
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );

  const userId = sessionData.session.user?.id;
  const activeOrgId = sessionData.session.session?.activeOrganizationId;

  const [myOrdersResult, customerOrdersResult, merchantStatsResult] =
    await Promise.all([
      getOrdersByUser(userId),
      activeOrgId ? getOrdersByOrganization(activeOrgId) : null,
      activeOrgId ? getOrderStats(activeOrgId, userId) : null,
    ]);

  const myOrders = myOrdersResult.orders ?? [];
  const customerOrders = customerOrdersResult?.orders ?? [];
  const merchantStats = merchantStatsResult?.stats ?? [];

  const hasAnyOrders = myOrders.length > 0 || customerOrders.length > 0;

  return (
    <div className="space-y-7">
      {!hasAnyOrders ? (
        activeOrgId ? (
          <Empty className="min-h-[400px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScrollText className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No orders yet</EmptyTitle>
              <EmptyDescription className="font-mono tracking-tighter">
                Start shopping from stores to place your first order. Your order
                history will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Empty className="min-h-[400px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Store className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No active stores</EmptyTitle>
              <EmptyDescription className="font-mono tracking-tighter">
                Please select or create a store from the top store switcher, to
                view and manage orders from your customers
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              The store switcher is located at the top of the sidebar, right
              below the logo.
            </EmptyContent>
          </Empty>
        )
      ) : (
        <OrderTabs
          myOrders={myOrders}
          customerOrders={customerOrders}
          merchantStats={merchantStats}
        />
      )}
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "Orders - Starva.shop";
  const description =
    "Manage and track all your orders in one place. View order status, track deliveries, and manage customer orders with Starva.shop's powerful order management system.";

  const ordersUrl = `${APP_URL}/orders`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: ordersUrl,
      type: "website",
      images: [
        {
          url: GENERAL_BRANDING_IMG_URL,
          width: 1200,
          height: 630,
          alt: "Starva.shop app - A sure platform for local stores and customers to meet. Easy, fast and reliable.",
        },
      ],
      siteName: "Starva.shop",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [GENERAL_BRANDING_IMG_URL],
    },
    alternates: {
      canonical: ordersUrl,
    },
  };
}

export default async function OrdersPage() {
  return (
    <div className="container mx-auto max-w-7xl py-7 space-y-7">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-0.5 text-sm text-pretty font-mono tracking-tighter">
          Manage and track all your orders
        </p>
      </div>
      <Suspense fallback={<OrdersPageSkeleton />}>
        <OrdersContent />
      </Suspense>
    </div>
  );
}
