import { Building2, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExtractedRegisterStoreDialog } from "@/components/forms/extracted-register-store-dialog";
import { SearchForm } from "@/components/forms/search-form";
import { SkeletonStoreCard } from "@/components/stores/skeleton-store-card";
import { StoreCatalogueSection } from "@/components/stores/store-catalogue-section";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getStoresPerUser } from "@/data/stores";
import { verifySession } from "@/data/user-session";
import { APP_URL, GENERAL_BRANDING_IMG_URL } from "@/lib/constants";

async function StoresList() {
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

  const storesPerUser = sessionData.success ? await getStoresPerUser() : [];

  if (storesPerUser.length === 0)
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No stores yet</EmptyTitle>
          <EmptyDescription className="font-mono tracking-tighter">
            Get started by creating your first store. You'll be able to manage
            products, team members, and more.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ExtractedRegisterStoreDialog />
        </EmptyContent>
      </Empty>
    );

  return <StoreCatalogueSection data={storesPerUser} />;
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "Stores - Starva.shop";
  const description =
    "Manage your stores with Starva.shop. Update products, track orders, and grow your store with powerful management tools.";

  const storesUrl = `${APP_URL}/stores`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: storesUrl,
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
      canonical: storesUrl,
    },
  };
}

export default async function StoresPage() {
  return (
    <div className="container mx-auto max-w-7xl py-7 space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Stores</h1>
          <p className="text-muted-foreground mt-0.5 text-sm text-pretty font-mono tracking-tighter">
            Manage and monitor all your stores in one place
          </p>
        </div>
        <ExtractedRegisterStoreDialog />
      </div>

      <Suspense
        fallback={
          <div className="w-full md:w-[380px] h-9 rounded-lg border shadow bg-background animate-pulse" />
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
              Loading stores...
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
        <StoresList />
      </Suspense>
    </div>
  );
}
