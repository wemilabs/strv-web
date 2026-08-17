import {
  LoaderIcon,
  Lock,
  Store,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import DiscoverUsersContent from "@/components/trends-and-socials/discover-users";
import FollowingFeedContent from "@/components/trends-and-socials/following-feed";
import TrendingMerchantsContent from "@/components/trends-and-socials/trending-merchants";
import TrendingProductsContent from "@/components/trends-and-socials/trending-products";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { verifySession } from "@/data/user-session";
import { GENERAL_BRANDING_IMG_URL } from "@/lib/constants";

export const instant = true;

async function TrendsAndSocialsContent() {
  const sessionData = await verifySession();

  if (!sessionData.success || !sessionData.session)
    return (
      <Empty className="min-h-100">
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

  return (
    <>
      <TabsContent value="following" className="mt-6">
        <FollowingFeedContent />
      </TabsContent>

      <TabsContent value="trending-products" className="mt-6">
        <TrendingProductsContent />
      </TabsContent>

      <TabsContent value="trending-merchants" className="mt-6">
        <TrendingMerchantsContent />
      </TabsContent>

      <TabsContent value="discover" className="mt-6">
        <DiscoverUsersContent />
      </TabsContent>
    </>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "Trends & Socials - Starva.shop";
  const description =
    "Discover what's trending in your area and gain valuable insights into customer preferences and market patterns.";

  const trendsUrl = `${
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  }/trends-and-socials`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: trendsUrl,
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
      canonical: trendsUrl,
    },
  };
}

export default function TrendsAndSocialsPage() {
  return (
    <div className="container mx-auto max-w-7xl py-7 space-y-7">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Trends & Socials
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm text-pretty font-mono tracking-tighter">
          Discover what's trending and find new merchants and users to follow.
        </p>
      </div>

      <Tabs defaultValue="following" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="following" className="gap-2">
            <Users className="size-4" />
            <span className="hidden sm:inline">Following</span>
          </TabsTrigger>
          <TabsTrigger value="trending-products" className="gap-2">
            <TrendingUp className="size-4" />
            <span className="hidden sm:inline">Trending</span>
          </TabsTrigger>
          <TabsTrigger value="trending-merchants" className="gap-2">
            <Store className="size-4" />
            <span className="hidden sm:inline">Merchants</span>
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-2">
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Discover</span>
          </TabsTrigger>
        </TabsList>

        <Suspense
          fallback={
            <Empty className="min-h-100">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <LoaderIcon className="size-6 animate-spin" />
                </EmptyMedia>
                <EmptyTitle>Data loading...</EmptyTitle>
                <EmptyDescription className="font-mono tracking-tighter">
                  Please wait while data is loading...
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
        >
          <TrendsAndSocialsContent />
        </Suspense>
      </Tabs>
    </div>
  );
}
