import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BillingContent } from "@/components/usage/billing-content";
import { GENERAL_BRANDING_IMG_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Billing & Usage - Starva.shop",
  description:
    "Monitor your current subscription plan, track usage limits for organizations, products, and orders, and manage your billing settings.",
  keywords: [
    "billing",
    "subscription",
    "usage tracking",
    "plan limits",
    "organization limits",
    "product limits",
    "order limits",
    "subscription management",
    "billing analytics",
    "usage monitoring",
    "plan upgrade",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://starva.shop/usage/billing",
    title: "Billing & Usage - Starva.shop",
    description:
      "Monitor your subscription plan and track usage limits for organizations, products, and orders.",
    siteName: "Starva.shop",
    images: [
      {
        url: GENERAL_BRANDING_IMG_URL,
        width: 1200,
        height: 630,
        alt: "Starva.shop Billing & Usage - Monitor your subscription",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Billing & Usage - Starva.shop",
    description:
      "Monitor your subscription plan and track usage limits in real-time.",
    images: [GENERAL_BRANDING_IMG_URL],
  },
};

export default function BillingPage() {
  return (
    <div className="container mx-auto max-w-7xl py-7 space-y-7">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Billing & Usage</h1>
        <p className="text-muted-foreground mt-0.5 text-sm text-pretty font-mono tracking-tighter">
          Monitor your subscription plan and track usage limits
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-7">
            <div className="rounded-lg border bg-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="grid gap-2 sm:grid-cols-2">
                  {["f1", "f2", "f3", "f4", "f5", "f6"].map(id => (
                    <Skeleton key={id} className="h-4 w-40" />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {["orgs", "products", "orders"].map(id => (
                <div
                  key={id}
                  className="rounded-lg border bg-card p-6 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="size-8" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {["upgrade", "change", "history", "report"].map(id => (
                  <Skeleton key={id} className="h-10 rounded-md" />
                ))}
              </div>
            </div>
          </div>
        }
      >
        <BillingContent />
      </Suspense>
    </div>
  );
}
