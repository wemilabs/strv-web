import { Lock, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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
import { WalletTabs } from "@/components/wallet/wallet-tabs";
import { verifySession } from "@/data/user-session";
import {
  getOrganizationForWallet,
  getWalletBalance,
  getWalletTransactions,
} from "@/data/wallet";
import { APP_URL, GENERAL_BRANDING_IMG_URL } from "@/lib/constants";

function WalletSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Skeleton className="h-10 w-full max-w-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}

async function WalletContent() {
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

  const activeOrgId = sessionData.session.session?.activeOrganizationId;

  if (!activeOrgId)
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Store className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No active stores</EmptyTitle>
          <EmptyDescription className="font-mono tracking-tighter">
            Please select or create a store from the top store switcher, to view
            your wallet and manage withdrawals
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          The store switcher is located at the top of the sidebar, right below
          the logo.
        </EmptyContent>
      </Empty>
    );

  const [balanceResult, transactionsResult, organizationResult] =
    await Promise.all([
      getWalletBalance(activeOrgId),
      getWalletTransactions(activeOrgId),
      getOrganizationForWallet(activeOrgId),
    ]);

  if (
    !balanceResult.ok ||
    !balanceResult.balance ||
    !transactionsResult.ok ||
    !organizationResult.ok ||
    !organizationResult.organization
  )
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Store className="size-6" />
          </EmptyMedia>
          <EmptyTitle>Store not found</EmptyTitle>
          <EmptyDescription className="font-mono tracking-tighter">
            The selected store could not be found
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <WalletTabs
      balance={balanceResult.balance}
      transactions={transactionsResult.transactions}
      organization={organizationResult.organization}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "Wallet - Starva.shop";
  const description =
    "Manage your store's wallet. View balance, request withdrawals, and track all transactions with Starva.shop.";

  const walletUrl = `${APP_URL}/point-of-sales/wallet`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: walletUrl,
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
      canonical: walletUrl,
    },
  };
}

export default async function WalletPage() {
  return (
    <div className="container mx-auto max-w-7xl py-7 space-y-7">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Wallet</h1>
        <p className="text-muted-foreground mt-0.5 text-sm text-pretty font-mono tracking-tighter">
          Manage your balance and withdrawals
        </p>
      </div>
      <Suspense fallback={<WalletSkeleton />}>
        <WalletContent />
      </Suspense>
    </div>
  );
}
