import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ExtractedRegisterStoreDialog } from "@/components/forms/extracted-register-store-dialog";
import { SearchForm } from "@/components/forms/search-form";
import { SkeletonStoreCard } from "@/components/stores/skeleton-store-card";
import { StoreCatalogueSection } from "@/components/stores/store-catalogue-section";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getAllStoresWithFollowData } from "@/data/stores";
import { GENERAL_BRANDING_IMG_URL } from "@/lib/constants";

export const instant = true;

async function MerchantsList() {
  const merchants = await getAllStoresWithFollowData();

  if (!merchants || merchants.length === 0) {
    return (
      <Empty className="min-h-100">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No merchants yet</EmptyTitle>
          <EmptyDescription className="font-mono tracking-tighter">
            Become a merchant and start reaching a broader clientele.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ExtractedRegisterStoreDialog />
        </EmptyContent>
      </Empty>
    );
  }

  return <StoreCatalogueSection data={merchants} />;
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "Merchants - Starva.shop";
  const description =
    "Discover and order from local merchants. Browse menus, find your favorite restaurants, and order delicious food from local kitchens.";

  const merchantsUrl = `${
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  }/merchants`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: merchantsUrl,
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
      canonical: merchantsUrl,
    },
  };
}

export default async function MerchantsPage() {
  return (
    <div className="container max-w-7xl py-7 space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Merchants</h1>
          <p className="text-muted-foreground mt-0.5 text-sm text-pretty font-mono tracking-tighter">
            Engage with all current available merchants
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="w-full md:w-95 h-9 rounded-lg border shadow bg-background animate-pulse" />
        }
      >
        <SearchForm
          formProps={{ className: "w-full md:w-[380px]" }}
          inputFieldOnlyClassName="h-9"
          placeholder="eg. prestige restaurant, a la baguee, etc."
        />
      </Suspense>

      <Suspense
        fallback={
          <>
            <div className="col-span-full text-sm text-pretty text-muted-foreground font-mono tracking-tighter">
              Loading merchants...
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkeletonStoreCard />
              <SkeletonStoreCard />
              <SkeletonStoreCard />
              <SkeletonStoreCard />
              <SkeletonStoreCard />
              <SkeletonStoreCard />
            </div>
          </>
        }
      >
        <MerchantsList />
      </Suspense>
    </div>
  );
}
