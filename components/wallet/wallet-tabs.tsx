"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  History,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Payment } from "@/db/schema";
import { cn, formatPriceInRWF } from "@/lib/utils";
import { TransactionList } from "./transaction-list";
import { WithdrawalForm } from "./withdrawal-form";

type WalletBalance = {
  totalCashin: number;
  totalCashout: number;
  pendingCashout: number;
  available: number;
};

type OrganizationInfo = {
  id: string;
  name: string;
  slug: string;
  phoneForPayments: string | null;
};

interface WalletTabsProps {
  balance: WalletBalance;
  transactions: Payment[];
  organization: OrganizationInfo;
}

interface WalletCardDataProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  valueColor: string;
}

export function WalletTabs({
  balance,
  transactions,
  organization,
}: WalletTabsProps) {
  const pendingCount = transactions.filter(t => t.status === "pending").length;

  const walletCardData: WalletCardDataProps[] = [
    {
      title: "Available Balance",
      value: balance.available,
      description: "Ready to withdraw",
      icon: <Wallet className="size-4 text-muted-foreground" />,
      valueColor: "",
    },
    {
      title: "Total Income",
      value: balance.totalCashin,
      description: "From customer orders",
      icon: <ArrowDownLeft className="size-4 text-green-500" />,
      valueColor: "text-green-600",
    },
    {
      title: "Total Withdrawn",
      value: balance.totalCashout,
      description: "Sent to your phone",
      icon: <ArrowUpRight className="size-4 text-blue-500" />,
      valueColor: "text-blue-600",
    },
    {
      title: "Pending Withdrawals",
      value: balance.pendingCashout,
      description: "Being processed",
      icon: <Clock className="size-4 text-yellow-500" />,
      valueColor: "text-yellow-600",
    },
  ];

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full max-w-lg grid-cols-3 mx-auto">
        <TabsTrigger value="overview" className="gap-1.5">
          <Wallet className="size-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="withdraw" className="gap-1.5">
          <ArrowUpRight className="size-4" />
          Withdraw
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-1.5">
          <History className="size-4" />
          History
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 mt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {walletCardData.map(
            ({ title, value, description, icon, valueColor }) => (
              <Card key={title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{title}</CardTitle>
                  {icon}
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      "text-2xl font-bold font-mono tracking-tighter",
                      valueColor,
                    )}
                  >
                    {formatPriceInRWF(value)}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono tracking-tighter">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ),
          )}
        </div>

        {transactions.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Recent Transactions</h3>
            <TransactionList transactions={transactions.slice(0, 5)} />
          </div>
        ) : (
          <Empty className="min-h-[200px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Wallet className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No transactions yet</EmptyTitle>
              <EmptyDescription className="font-mono tracking-tighter">
                When customers pay for orders, transactions will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </TabsContent>

      <TabsContent value="withdraw" className="space-y-6 mt-6">
        <WithdrawalForm balance={balance} organization={organization} />
      </TabsContent>

      <TabsContent value="history" className="space-y-6 mt-6">
        {transactions.length > 0 ? (
          <TransactionList transactions={transactions} />
        ) : (
          <Empty className="min-h-[300px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <History className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No transaction history</EmptyTitle>
              <EmptyDescription className="font-mono tracking-tighter">
                Your transaction history will appear here once you start
                receiving payments.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </TabsContent>
    </Tabs>
  );
}
