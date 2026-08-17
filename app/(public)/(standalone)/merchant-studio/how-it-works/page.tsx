import {
  ArrowRight,
  BadgeDollarSign,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Store,
} from "lucide-react";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Merchant Studio - How it works | Starva.shop",
  description:
    "Learn what you get with Merchant Studio and how to unlock payouts, invoices, POS, and more.",
};

const HIGHLIGHTS = [
  {
    title: "Payouts",
    description:
      "Track balances, withdraw funds, and monitor payout history for your stores.",
    icon: BadgeDollarSign,
  },
  {
    title: "Invoices",
    description:
      "Generate invoices for orders and keep your business paperwork organized.",
    icon: Receipt,
  },
  {
    title: "Point of Sale (POS)",
    description:
      "Manage in-person sales, keep inventory in sync, and process orders quickly.",
    icon: CreditCard,
  },
  {
    title: "Store & product management",
    description:
      "Create and manage stores, add products, update pricing, and publish updates.",
    icon: Store,
  },
  {
    title: "Orders & operations",
    description:
      "Handle incoming orders, update statuses, and keep fulfillment under control.",
    icon: ClipboardList,
  },
  {
    title: "Insights & dashboard",
    description:
      "See performance at a glance and understand what’s driving revenue.",
    icon: LayoutDashboard,
  },
] as const;

export default async function MerchantStudioHowItWorksPage() {
  "use cache";
  cacheLife("max");

  return (
    <div className="container mx-auto max-w-7xl py-7 space-y-7">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">
          Merchant Studio — How it works
        </h1>
        <p className="text-muted-foreground text-sm text-pretty font-mono tracking-tighter">
          Subscribe to unlock the tools you need to run your business on
          Starva.shop.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What you unlock</CardTitle>
          <CardDescription className="font-mono tracking-tighter">
            Merchant Studio is your workspace for payouts, invoices, POS, and
            commerce operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map(item => (
              <div
                key={item.title}
                className="rounded-lg border bg-background p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md border p-2">
                    <item.icon className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground font-mono tracking-tighter">
                      {item.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to get access</CardTitle>
          <CardDescription className="font-mono tracking-tighter">
            Pick a plan, subscribe, then return to the mobile app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 text-sm text-muted-foreground font-mono tracking-tighter">
            <li>
              1. Choose a plan that matches your needs (you can upgrade later).
            </li>
            <li>
              2. Subscribe on the web to unlock Merchant Studio tools on your
              account.
            </li>
            <li>3. Come back to the app and open Merchant Studio.</li>
          </ol>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="sm:w-auto">
              <Link href="/usage/pricing">
                <span>Choose a plan</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="sm:w-auto">
              <Link href="/merchants">
                <span>Explore merchants</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
