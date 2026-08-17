"use client";

import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cancelOrder } from "@/server/orders";
import { Spinner } from "../ui/spinner";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelOrder(orderId);
        toast.success("Done!", {
          description: "Order cancelled successfully",
        });
        router.refresh();
        setAlertDialogOpen(false);
      } catch (error) {
        const e = error as Error;
        console.error("Cancel order error:", e.message);
        toast.error("Failure", {
          description: e.message || "Failed to cancel order",
        });
      }
    });
  };

  return (
    <AlertDialog onOpenChange={setAlertDialogOpen} open={alertDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full" disabled={isPending}>
          <XCircle className="size-4" />
          Cancel Order
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Order</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this order? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, keep order</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault();
              handleCancel();
            }}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <Spinner />
                Cancelling...
              </div>
            ) : (
              "Yes, cancel order"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
