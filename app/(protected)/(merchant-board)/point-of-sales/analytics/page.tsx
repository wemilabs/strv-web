import { Lock, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import {
  GrowthAnalyticsChart,
  ProAnalyticsChart,
  StarterAnalyticsChart,
} from "@/components/analytics/analytics-charts";
import { AnalyticsHero } from "@/components/analytics/analytics-hero";
import { AnalyticsWrapper } from "@/components/analytics/analytics-wrapper";
import { MetricsCards } from "@/components/analytics/metrics-cards";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { verifySession } from "@/data/user-session";
import { APP_URL, GENERAL_BRANDING_IMG_URL } from "@/lib/constants";
import { getOrganizationAnalyticsOverview } from "@/server/orders";
import { getUserSubscription } from "@/server/subscription";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Analytics Dashboard - Starva.shop";
  const description =
    "Powerful insights and analytics to help you make data-driven decisions. Track sales, monitor performance, and grow your store with detailed metrics and reports.";

  const analyticsUrl = `${APP_URL}/analytics`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: analyticsUrl,
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
      canonical: analyticsUrl,
    },
  };
}

export default function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-6xl space-y-8">
        <Suspense
          fallback={
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-end-safe">
                <Skeleton className="h-8 w-48 rounded-full" />
              </div>
              <Skeleton className="h-40 rounded-2xl" />
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            </div>
          }
        >
          <AnalyticsWrapper>
            <AnalyticsContent searchParams={searchParams} />
          </AnalyticsWrapper>
        </Suspense>
      </div>
    </div>
  );
}

async function AnalyticsContent({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  "use cache: private";
  cacheLife("seconds");

  const sessionData = await verifySession();

  if (!sessionData.success || !sessionData.session)
    return (
      <div className="flex flex-col items-center justify-center px-6 py-8">
        <Empty className="max-w-md w-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Lock className="size-6" />
            </EmptyMedia>
            <EmptyTitle>You are not yet signed in</EmptyTitle>
            <EmptyDescription className="font-mono tracking-tighter">
              Sign in first to access analytics.
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
      </div>
    );

  const userId = sessionData.session.user?.id;
  const activeOrgId = sessionData.session.session?.activeOrganizationId;

  if (!activeOrgId)
    return (
      <div className="flex flex-col items-center justify-center px-6 py-8">
        <Empty className="max-w-md w-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Warehouse className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No active stores</EmptyTitle>
            <EmptyDescription className="font-mono tracking-tighter">
              Please select or create a store from the top store switcher, to
              view analytics.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            The store switcher is located at the top of the sidebar, right below
            the logo.
          </EmptyContent>
        </Empty>
      </div>
    );

  const subscription = userId ? await getUserSubscription(userId) : null;
  const planName = subscription?.plan?.name ?? "Starter";

  const params = await searchParams;
  const days = parseInt(params.days || "28", 10) as 7 | 14 | 28;

  const { starterSeries, growthSeries, proSeries, metrics } =
    await getOrganizationAnalyticsOverview(activeOrgId, days);

  return (
    <div className="space-y-10">
      <AnalyticsHero planName={planName} />

      <MetricsCards
        totalOrders={metrics?.totalOrders ?? 0}
        totalRevenue={metrics?.totalRevenue ?? 0}
        averageOrderValue={metrics?.averageOrderValue ?? 0}
        peakHour={metrics?.peakHour ?? 0}
        peakHourOrders={metrics?.peakHourOrders ?? 0}
      />

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-mono tracking-tighter text-muted-foreground mb-1">
            Core metrics
          </p>
          <h2 className="text-sm font-medium mb-2">Starter analytics</h2>
          <p className="text-xs text-muted-foreground font-mono tracking-tighter">
            Daily/7-day overview of orders for your active store.
          </p>
          <StarterAnalyticsChart data={starterSeries ?? []} />
        </div>

        {planName !== "Starter" && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs font-mono tracking-tighter text-muted-foreground mb-1">
              Growth & Pro
            </p>
            <h2 className="text-sm font-medium mb-2">
              Deeper trends & insights
            </h2>
            <p className="text-xs text-muted-foreground font-mono tracking-tighter">
              4-week revenue trends to help you understand how your active store
              is growing.
            </p>
            <GrowthAnalyticsChart data={growthSeries ?? []} />
          </div>
        )}

        {planName === "Pro" && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs font-mono tracking-tighter text-muted-foreground mb-1">
              Pro only
            </p>
            <h2 className="text-sm font-medium mb-2">Product performance</h2>
            <p className="text-xs text-muted-foreground font-mono tracking-tighter">
              Top 5 products by revenue to identify your best sellers.
            </p>
            <ProAnalyticsChart data={proSeries ?? []} />
          </div>
        )}
      </section>
    </div>
  );
}
