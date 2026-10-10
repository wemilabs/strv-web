import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Phone,
  ShoppingBag,
  Store,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
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
import { verifySession } from "@/data/user-session";
import { getTransactionById } from "@/data/wallet";
import { APP_URL, GENERAL_BRANDING_IMG_URL } from "@/lib/constants";
import { cn, formatDate, formatPriceInRWF } from "@/lib/utils";

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "secondary" as const,
    className: "text-yellow-600",
    bgClassName: "bg-yellow-100",
  },
  successful: {
    label: "Completed",
    icon: CheckCircle2,
    variant: "default" as const,
    className: "text-green-600",
    bgClassName: "bg-green-100",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    variant: "destructive" as const,
    className: "text-red-600",
    bgClassName: "bg-red-100",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    variant: "outline" as const,
    className: "text-muted-foreground",
    bgClassName: "bg-muted",
  },
};

async function TransactionContent({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = await params;

  const session = await verifySession();
  if (!session?.session) {
    redirect("/sign-in");
  }

  const transactionResult = await getTransactionById(transactionId);
  if (!transactionResult.ok || !transactionResult.transaction) notFound();

  const transaction = transactionResult.transaction;
  const activeOrgId = session.session.session.activeOrganizationId;
  const hasAccess = transaction.organizationId === activeOrgId;

  if (!hasAccess) redirect("/point-of-sales/wallet");

  const isCashin = transaction.kind === "CASHIN";
  const status = statusConfig[transaction.status as keyof typeof statusConfig];
  const StatusIcon = status.icon;

  return (
    <div className="container mx-auto max-w-7xl py-7 space-y-7">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/point-of-sales/wallet">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-medium tracking-tight">
            Transaction Details
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm font-mono tracking-tighter">
            {formatDate(transaction.createdAt)}
          </p>
        </div>
        <Badge variant={status.variant} className="gap-1.5">
          <StatusIcon className="size-3.5" />
          {status.label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex size-14 items-center justify-center rounded-full",
                    isCashin ? "bg-green-100" : "bg-blue-100",
                  )}
                >
                  {isCashin ? (
                    <ArrowDownLeft className="size-7 text-green-600" />
                  ) : (
                    <ArrowUpRight className="size-7 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle>
                    {isCashin ? "Payment Received" : "Withdrawal"}
                  </CardTitle>
                  <CardDescription className="font-mono tracking-tighter">
                    {isCashin
                      ? "Funds added to your wallet"
                      : "Funds sent to your phone"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <p
                  className={cn(
                    "text-4xl font-bold font-mono tracking-tighter",
                    isCashin ? "text-green-600" : "text-blue-600",
                  )}
                >
                  {isCashin ? "+" : "-"}
                  {formatPriceInRWF(
                    parseFloat(
                      isCashin && transaction.baseAmount
                        ? transaction.baseAmount
                        : transaction.amount,
                    ),
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {transaction.currency}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CreditCard className="size-4" />
                    Transaction Type
                  </span>
                  <span className="font-medium">
                    {isCashin ? "Cash In" : "Cash Out"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="size-4" />
                    Phone Number
                  </span>
                  <span className="font-medium font-mono tracking-tighter">
                    {transaction.phoneNumber}
                  </span>
                </div>
                {transaction.paypackRef && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-medium font-mono tracking-tighter">
                      {transaction.paypackRef}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {transaction.order && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="size-5" />
                  Related Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/point-of-sales/orders/${transaction.order.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">
                      Order #{transaction.order.orderNumber}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono tracking-tighter">
                      {formatDate(transaction.order.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline">View Order</Badge>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {transaction.organization && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="size-5" />
                  Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/stores/${transaction.organization.slug}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {transaction.organization.logo ? (
                    <div className="relative size-12 rounded-lg overflow-hidden">
                      <Image
                        src={transaction.organization.logo}
                        alt={transaction.organization.name}
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
                    <p className="font-medium">
                      {transaction.organization.name}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono tracking-tighter">
                      @{transaction.organization.slug}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground font-mono tracking-tighter">
                  Created:
                </span>
                <span className="font-medium">
                  {formatDate(transaction.createdAt)}
                </span>
              </div>
              {transaction.processedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span className="text-muted-foreground font-mono tracking-tighter">
                    Processed:
                  </span>
                  <span className="font-medium">
                    {formatDate(transaction.processedAt)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg",
                  status.bgClassName,
                )}
              >
                <StatusIcon className={cn("size-5", status.className)} />
                <div>
                  <p className={cn("font-medium", status.className)}>
                    {status.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.status === "pending" &&
                      "Waiting for confirmation"}
                    {transaction.status === "successful" &&
                      "Transaction completed successfully"}
                    {transaction.status === "failed" &&
                      "Transaction could not be completed"}
                    {transaction.status === "expired" &&
                      "Transaction expired before completion"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}): Promise<Metadata> {
  const { transactionId } = await params;

  const transactionResult = await getTransactionById(transactionId);
  if (!transactionResult.ok || !transactionResult.transaction) {
    return {
      title: "Transaction Not Found - Starva.shop",
      description: "The requested transaction could not be found.",
    };
  }

  const transaction = transactionResult.transaction;
  const isCashin = transaction.kind === "CASHIN";
  const typeLabel = isCashin ? "Payment Received" : "Withdrawal";

  const title = `${typeLabel} - ${formatPriceInRWF(
    parseFloat(transaction.amount),
  )} - Starva.shop`;
  const description = `${typeLabel} of ${formatPriceInRWF(
    parseFloat(transaction.amount),
  )} on ${formatDate(transaction.createdAt)}. Status: ${transaction.status}.`;

  const transactionUrl = `${APP_URL}/point-of-sales/wallet/transactions/${transactionId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: transactionUrl,
      type: "website",
      images: [
        {
          url: GENERAL_BRANDING_IMG_URL,
          width: 1200,
          height: 630,
          alt: "Starva.shop",
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
      canonical: transactionUrl,
    },
  };
}

export default async function TransactionPage(
  props: PageProps<"/point-of-sales/wallet/transactions/[transactionId]">,
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
            <Skeleton className="h-6 w-24" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-lg border p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-14 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="mt-1 h-4 w-32" />
                  </div>
                </div>

                <div className="text-center py-6">
                  <Skeleton className="h-12 w-48 mx-auto" />
                  <Skeleton className="h-4 w-12 mx-auto mt-2" />
                </div>

                <Skeleton className="h-px w-full" />

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border p-6 space-y-4">
                <Skeleton className="h-6 w-16" />
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="mt-1 h-4 w-24" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-6 space-y-3">
                <Skeleton className="h-6 w-20" />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>

              <div className="rounded-lg border p-6 space-y-3">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <TransactionContent params={props.params} />
    </Suspense>
  );
}
