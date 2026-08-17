import { ArrowLeft, Calendar, CheckCircle, Package } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity, Suspense } from "react";
import { CancelOrderButton } from "@/components/orders/cancel-order-button";
import { MarkAsDeliveredButton } from "@/components/orders/mark-as-delivered-button";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderStatusSelect } from "@/components/orders/order-status-select";
import { PayOrderButton } from "@/components/orders/pay-order-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrderById } from "@/data/orders";
import { verifySession } from "@/data/user-session";
import { GENERAL_BRANDING_IMG_URL } from "@/lib/constants";
import { calculateOrderFees, formatDate, formatPriceInRWF } from "@/lib/utils";

async function OrderContent({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const session = await verifySession();
  if (!session?.session) {
    redirect("/sign-in");
  }

  const orderResult = await getOrderById(orderId);
  if (!orderResult.ok) notFound();

  const order = orderResult.order;
  const isOwner = order.userId === session.session.user.id;
  const activeOrgId = session.session.session.activeOrganizationId;
  const isMerchant = order.organizationId === activeOrgId;

  const totalItems = order.orderItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const fees = calculateOrderFees(Number(order.totalPrice));
  const displayTotal = isMerchant ? Number(order.totalPrice) : fees.totalAmount;

  const orderNumber = isMerchant
    ? order.merchantOrderNumber
    : order.customerOrderNumber;

  return (
    <div className="container mx-auto max-w-7xl py-7 space-y-7">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/point-of-sales/orders">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-medium tracking-tight">
            Order #{orderNumber}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm font-mono tracking-tighter">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <Activity mode={order.isPaid ? "visible" : "hidden"}>
            <Badge variant="successful">
              <CheckCircle className="size-3" />
              Paid
            </Badge>
          </Activity>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex flex-col space-y-1">
                  <CardTitle>Order Items</CardTitle>
                  <CardDescription className="font-mono tracking-tighter">
                    {totalItems} {totalItems === 1 ? "item" : "items"} in this
                    order
                  </CardDescription>
                </div>
                {isMerchant && (
                  <OrderStatusSelect
                    orderId={order.id}
                    currentStatus={order.status}
                    isPaid={order.isPaid}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.orderItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 rounded-lg border"
                  >
                    <div className="relative size-16 rounded-md overflow-hidden bg-muted">
                      {item.product.imageUrls?.[0] ? (
                        <Image
                          src={item.product.imageUrls[0]}
                          alt={item.product.name}
                          fill
                          sizes="64px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Package className="size-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-medium text-sm md:text-base">
                        {item.product.name}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono tracking-tighter">
                          {formatPriceInRWF(item.priceAtOrder)} ×{" "}
                          {item.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm font-mono tracking-tighter">
                        {formatPriceInRWF(item.subtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-0.5">
                <div className="flex justify-between font-semibold">
                  <span>
                    {!order.isPaid ? "Total to be paid" : "Total paid"}
                  </span>
                  <span className="text-lg">
                    {formatPriceInRWF(displayTotal)}
                  </span>
                </div>
                <Activity mode={!isMerchant ? "visible" : "hidden"}>
                  <p className="text-xs text-muted-foreground text-right">
                    Includes {formatPriceInRWF(fees.totalFee)} processing fee
                  </p>
                </Activity>
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm font-mono tracking-tighter">
                  {order.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage src={order.user.image || undefined} />
                  <AvatarFallback>
                    {order.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{order.user.name}</p>
                  <p className="text-sm text-muted-foreground font-mono tracking-tighter">
                    {order.user.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.organization && (
            <Card>
              <CardHeader>
                <CardTitle>Store</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/stores/${order.organization.slug}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {order.organization.logo ? (
                    <div className="relative size-12 rounded-lg overflow-hidden">
                      <Image
                        src={order.organization.logo}
                        alt={order.organization.name}
                        fill
                        sizes="48px"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="size-12 rounded-lg bg-linear-to-br from-orange-500 to-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium">{order.organization.name}</p>
                    <p className="text-sm text-muted-foreground font-mono tracking-tighter">
                      @{order.organization.slug}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground font-mono tracking-tighter">
                  Created:
                </span>
                <span className="font-medium">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground font-mono tracking-tighter">
                  Updated:
                </span>
                <span className="font-medium">
                  {formatDate(order.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Activity
              mode={
                isOwner &&
                !isMerchant &&
                order.status === "confirmed" &&
                !order.isPaid
                  ? "visible"
                  : "hidden"
              }
            >
              <PayOrderButton
                orderId={order.id}
                orderNumber={orderNumber}
                storeName={order.organization.name}
                amount={Number(order.totalPrice)}
              />
            </Activity>
            <Activity
              mode={
                isOwner &&
                !isMerchant &&
                order.isPaid &&
                order.status !== "delivered" &&
                order.status !== "cancelled"
                  ? "visible"
                  : "hidden"
              }
            >
              <MarkAsDeliveredButton orderId={order.id} />
            </Activity>
            <Activity
              mode={
                (isOwner || isMerchant) &&
                order.status !== "delivered" &&
                order.status !== "cancelled"
                  ? "visible"
                  : "hidden"
              }
            >
              <CancelOrderButton orderId={order.id} />
            </Activity>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderId: string }>;
}): Promise<Metadata> {
  const { orderId } = await params;

  const orderResult = await getOrderById(orderId);
  if (!orderResult.ok) {
    return {
      title: "Order Not Found - Starva.shop",
      description: "The requested order could not be found.",
    };
  }

  const order = orderResult.order;

  const session = await verifySession();
  const activeOrgId = session?.session?.session.activeOrganizationId;
  const isMerchant = order.organizationId === activeOrgId;

  const orderNumber = isMerchant
    ? order.merchantOrderNumber
    : order.customerOrderNumber;

  const totalItems = order.orderItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const firstItem = order.orderItems[0];
  const hasMultipleItems = order.orderItems.length > 1;

  const title = `Order #${orderNumber} - Starva.shop`;
  const description = hasMultipleItems
    ? `Order #${orderNumber} with ${totalItems} items. Total: ${formatPriceInRWF(
        order.totalPrice,
      )}. Placed on ${formatDate(order.createdAt)}. Status: ${order.status}.`
    : `Order #${orderNumber} for ${
        firstItem?.product.name || "items"
      }. Total: ${formatPriceInRWF(order.totalPrice)}. Placed on ${formatDate(
        order.createdAt,
      )}. Status: ${order.status}.`;

  const images = [];
  if (firstItem?.product.imageUrls?.[0]) {
    images.push({
      url: firstItem.product.imageUrls[0],
      width: 1200,
      height: 630,
      alt: firstItem.product.name,
    });
  } else {
    images.push({
      url: GENERAL_BRANDING_IMG_URL,
      width: 1200,
      height: 630,
      alt: "Starva.shop app - A sure platform for local stores and customers to meet. Easy, fast and reliable.",
    });
  }

  const orderUrl = `${
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  }/orders/${orderId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: orderUrl,
      type: "website",
      images,
      siteName: "Starva.shop",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map(img => img.url),
    },
    alternates: {
      canonical: orderUrl,
    },
  };
}

export default async function OrderPage(
  props: PageProps<"/point-of-sales/orders/[orderId]">,
) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl py-7 space-y-7">
          <div className="flex items-center gap-4">
            <Skeleton className="size-10" />
            <div className="flex-1">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="mt-2 h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-lg border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="mt-1 h-4 w-24" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>

                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-3 rounded-lg border"
                    >
                      <Skeleton className="size-16 rounded-md" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="mt-2 h-4 w-24" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-5 w-20 ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border p-6 space-y-4">
                <Skeleton className="h-6 w-24" />
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="mt-1 h-4 w-40" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-6 space-y-4">
                <Skeleton className="h-6 w-24" />
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="mt-1 h-4 w-24" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-6 space-y-3">
                <Skeleton className="h-6 w-32" />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>

              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      }
    >
      <OrderContent params={props.params} />
    </Suspense>
  );
}
