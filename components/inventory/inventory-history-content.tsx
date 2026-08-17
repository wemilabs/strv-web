"use client";

import { History } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { InventoryHistory } from "@/db/schema";
import { cn, formatDate } from "@/lib/utils";
import { getInventoryHistory } from "@/server/inventory";

type InventoryHistoryProps = {
  productId: string;
  productName: string;
  organizationId: string;
};

export function InventoryHistoryContent({
  productId,
  productName,
  organizationId,
}: InventoryHistoryProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [history, setHistory] = useState<InventoryHistory[]>([]);
  const [isPending, startTransition] = useTransition();

  const loadHistory = () => {
    startTransition(async () => {
      const result = await getInventoryHistory({
        productId,
        organizationId,
        limit: 50,
      });
      if (result.ok) {
        setHistory(result.history);
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (open) {
      loadHistory();
    } else {
      setHistory([]);
    }
  };

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      adjustment: "Manual Adjustment",
      restock: "Restock",
      sale: "Sale",
      return: "Customer Return",
      damaged: "Damaged/Lost",
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 justify-start">
          <History className="size-4" />
          <span>View History</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Inventory History</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        <div className="h-96 overflow-y-auto">
          {isPending ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-muted-foreground">
                Loading history...
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <History className="size-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No history yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Stock changes will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {history.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {getChangeTypeLabel(item.changeType)}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-mono",
                          item.quantityChange > 0
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {item.quantityChange > 0 ? "+" : ""}
                        {item.quantityChange}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.reason || "No reason provided"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stock after: {item.newStock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
