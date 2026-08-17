"use client";

import {
  CheckCircle,
  CreditCard,
  Loader2,
  Smartphone,
  XCircle,
} from "lucide-react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type BillingPeriod, PRICING_PLANS, USD_TO_RWF } from "@/lib/constants";
import { calculateSubscriptionFees } from "@/lib/utils";
import {
  checkPaymentStatus,
  initiateSubscriptionPayment,
} from "@/server/payments";
import { Spinner } from "../ui/spinner";

type PaymentStatus = "idle" | "pending" | "polling" | "success" | "failed";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  billingPeriod?: BillingPeriod;
  isRenewal?: boolean;
  defaultPhone?: string | null;
  onSuccess?: () => void;
}

export function PaymentModal({
  open,
  onOpenChange,
  planName,
  billingPeriod = "monthly",
  isRenewal = false,
  defaultPhone,
  onSuccess,
}: PaymentModalProps) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const plan = PRICING_PLANS.find(p => p.name === planName);
  const priceUSD =
    billingPeriod === "yearly" ? plan?.yearlyPrice : plan?.monthlyPrice;
  const baseAmountRWF = priceUSD ? Math.round(priceUSD * USD_TO_RWF) : 0;
  const fees = calculateSubscriptionFees(baseAmountRWF);

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Poll for payment status
  useEffect(() => {
    if (status !== "polling" || !paymentRef) return;

    pollIntervalRef.current = setInterval(async () => {
      const result = await checkPaymentStatus(paymentRef);

      if (result.status === "successful") {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStatus("success");
        toast.success("Payment successful! Your subscription is now active.");
        onSuccess?.();
        setTimeout(() => onOpenChange(false), 2000);
      } else if (result.status === "failed") {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStatus("failed");
        toast.error("Payment failed. Please try again.");
      }
    }, 3000);

    // Stop polling after 2 minutes
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
  }, [status, paymentRef, onSuccess, onOpenChange]);

  // Initiate the payment
  const handleInitiatePayment = async () => {
    if (!phone || phone.length < 9) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setStatus("pending");

    try {
      const result = await initiateSubscriptionPayment({
        planName,
        phoneNumber: phone,
        billingPeriod,
        isRenewal,
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

  const handleClose = () => {
    if (status === "polling") {
      toast.info(
        "Payment is being processed. You'll be notified when it completes.",
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5" />
            Pay with Mobile Money
          </DialogTitle>
          <DialogDescription>
            {isRenewal ? "Renew your" : "Subscribe to"} {planName} plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Amount to pay</p>
            <p className="text-3xl font-bold">
              {fees.totalAmount.toLocaleString()} RWF
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ ${priceUSD}/{billingPeriod === "yearly" ? "year" : "month"}
            </p>
          </div>

          {/* Phone input */}
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

          {/* Status messages */}
          {status === "polling" && (
            <Alert>
              <Loader2 className="size-4 animate-spin" />
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
                Payment successful! Your subscription is now active.
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
            onClick={handleClose}
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
