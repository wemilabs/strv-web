import type { Metadata } from "next";
import { Suspense } from "react";
import { InventoryPageWrapper } from "@/components/inventory/inventory-page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_URL, GENERAL_BRANDING_IMG_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Inventory Management - Starva.shop",
  description:
    "Track and manage your product stock levels, monitor inventory changes, adjust stock quantities, and receive low stock alerts in real-time.",
  keywords: [
    "inventory management",
    "stock tracking",
    "inventory control",
    "stock levels",
    "inventory alerts",
    "stock management",
    "product inventory",
    "warehouse management",
    "inventory system",
    "stock adjustment",
    "low stock alerts",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${APP_URL}/inventory`,
    title: "Inventory Management - Starva.shop",
    description:
      "Track and manage your product stock levels, monitor inventory changes, and receive low stock alerts in real-time.",
    siteName: "Starva.shop",
    images: [
      {
        url: GENERAL_BRANDING_IMG_URL,
        width: 1200,
        height: 630,
        alt: "Starva.shop Inventory Management - Track your stock levels",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inventory Management - Starva.shop",
    description:
      "Track and manage your product stock levels with real-time inventory monitoring.",
    images: [GENERAL_BRANDING_IMG_URL],
  },
};

export default function InventoryPage() {
  return (
    <div className="container mx-auto max-w-7xl py-7 space-y-7">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Inventory Management
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm text-pretty font-mono tracking-tighter">
          Track and manage your product stock levels
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-7">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
            <div className="space-y-4 p-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          </div>
        }
      >
        <InventoryPageWrapper />
      </Suspense>
    </div>
  );
}
