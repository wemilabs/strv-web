"use client";

import { CheckCircle, CreditCard, Smartphone, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { calculateOrderFees } from "@/lib/utils";
import {
  checkOrderPaymentStatus,
  initiateOrderPayment,
} from "@/server/payments";

type PaymentStatus = "idle" | "pending" | "polling" | "success" | "failed";

interface PayOrderButtonProps {
  orderId: string;
  orderNumber: number;
  storeName: string;
  amount: number;
  defaultPhone?: string | null;
}

export function PayOrderButton({
  orderId,
  orderNumber,
  storeName,
  amount,
  defaultPhone,
}: PayOrderButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhone || "");
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fees = calculateOrderFees(amount);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (status !== "polling" || !paymentRef) return;

    pollIntervalRef.current = setInterval(async () => {
      const result = await checkOrderPaymentStatus(paymentRef);

      if (result.status === "successful") {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStatus("success");
        toast.success("Payment successful!");
        setTimeout(() => {
          setOpen(false);
          router.refresh();
        }, 2000);
      } else if (result.status === "failed") {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStatus("failed");
        toast.error("Payment failed. Please try again.");
      }
    }, 3000);

    timeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (status === "polling") {
        setStatus("idle");
        toast.info(
          "Payment timed out. If you approved the payment, it will be processed shortly.",
        );
      }
    }, 120000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [status, paymentRef, router]);

  const handleInitiatePayment = async () => {
    if (!phone || phone.length < 9) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setStatus("pending");

    try {
      const result = await initiateOrderPayment({
        orderId,
        phoneNumber: phone,
      });

      if (result.error) {
        toast.error(result.error);
        setStatus("failed");
        return;
      }

      if (result.paypackRef) {
        setPaymentRef(result.paypackRef);
        setStatus("polling");
      }
    } catch {
      toast.error("Failed to initiate payment");
      setStatus("failed");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && status === "polling") {
      toast.info(
        "Payment is being processed. You'll be notified when it completes.",
      );
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <CreditCard className="mr-2 size-4" />
          Pay {fees.totalAmount.toLocaleString()} RWF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5" />
            Pay for Order #{orderNumber}
          </DialogTitle>
          <DialogDescription>
            Pay {storeName} via Mobile Money
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Amount to pay</p>
            <p className="text-3xl font-bold">
              {fees.totalAmount.toLocaleString()} RWF
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Money Number</Label>
            <div className="flex">
              <span className="inline-flex items-center gap-1.5 px-3 border border-r-0 rounded-l-md bg-muted text-sm font-medium text-muted-foreground">
                <span>🇷🇼</span>
                <span>+250</span>
              </span>
              <Input
                id="phone"
                placeholder="78XXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                disabled={status === "pending" || status === "polling"}
                maxLength={9}
                className="rounded-l-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              MTN Mobile Money or Airtel Money
            </p>
          </div>

          {status === "polling" && (
            <Alert>
              <Spinner />
              <AlertDescription>
                A payment prompt has been sent to your phone. Please enter your
                PIN to confirm.
              </AlertDescription>
            </Alert>
          )}

          {status === "success" && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="size-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Payment successful! Thank you for your order.
              </AlertDescription>
            </Alert>
          )}

          {status === "failed" && (
            <Alert variant="destructive">
              <XCircle className="size-4" />
              <AlertDescription>
                Payment failed or was cancelled. Please try again.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={status === "pending"}
          >
            {status === "polling" ? "Close" : "Cancel"}
          </Button>
          <Button
            onClick={handleInitiatePayment}
            disabled={
              !phone ||
              phone.length < 9 ||
              status === "pending" ||
              status === "polling" ||
              status === "success"
            }
          >
            {status === "pending" ? (
              <>
                <Spinner />
                Initiating...
              </>
            ) : status === "polling" ? (
              <>
                <Spinner />
                Waiting...
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle className="size-4" />
                Success!
              </>
            ) : (
              <>
                <CreditCard className="size-4" />
                Pay {fees.totalAmount.toLocaleString()} RWF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
