"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Filter,
  History,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Payment } from "@/db/schema";
import { cn, formatDate, formatPriceInRWF } from "@/lib/utils";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";

type StatusFilter = "all" | "pending" | "successful" | "failed" | "expired";

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "secondary" as const,
    className: "text-yellow-600",
  },
  successful: {
    label: "Completed",
    icon: CheckCircle2,
    variant: "default" as const,
    className: "text-green-600",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    variant: "destructive" as const,
    className: "text-red-600",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    variant: "outline" as const,
    className: "text-muted-foreground",
  },
};

export function TransactionList({ transactions }: { transactions: Payment[] }) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter(tx => tx.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredTransactions.length} transaction
          {filteredTransactions.length <= 1 ? "" : "s"}
        </p>
        <Select
          value={filter}
          onValueChange={value => setFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-[140px]">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="successful">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Empty className="min-h-[300px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <History className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No transaction found</EmptyTitle>
              <EmptyDescription className="font-mono tracking-tighter">
                No transaction found matching this criteria.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          filteredTransactions.map(tx => {
            const isCashin = tx.kind === "CASHIN";
            const status = statusConfig[tx.status];
            const StatusIcon = status.icon;

            return (
              <Card key={tx.id} className="overflow-hidden">
                <Link href={`/point-of-sales/wallet/transactions/${tx.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-10 items-center justify-center rounded-full",
                            isCashin ? "bg-green-100" : "bg-blue-100",
                          )}
                        >
                          {isCashin ? (
                            <ArrowDownLeft className="size-5 text-green-600" />
                          ) : (
                            <ArrowUpRight className="size-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {isCashin ? "Payment Received" : "Withdrawal"}
                          </p>
                          <p className="text-sm text-muted-foreground font-mono tracking-tighter">
                            {tx.phoneNumber}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={cn(
                            "font-semibold font-mono tracking-tighter",
                            isCashin ? "text-green-600" : "text-blue-600",
                          )}
                        >
                          {isCashin ? "+" : "-"}
                          {formatPriceInRWF(
                            parseFloat(
                              isCashin && tx.baseAmount
                                ? tx.baseAmount
                                : tx.amount,
                            ),
                          )}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <StatusIcon
                            className={cn("size-3.5", status.className)}
                          />
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono tracking-tighter">
                        {formatDate(tx.createdAt)}
                      </span>
                      <span className="font-mono tracking-tighter truncate max-w-[150px]">
                        Ref: {tx.paypackRef?.slice(0, 8)}...
                      </span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
