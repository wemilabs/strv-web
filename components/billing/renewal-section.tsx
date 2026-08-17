"use client";

import { AlertTriangle, Calendar, Clock, CreditCard } from "lucide-react";
import { Activity, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Subscription } from "@/db/schema";
import { cn, formatDateShort, getDaysUntil } from "@/lib/utils";
import { PaymentModal } from "./payment-modal";

interface RenewalSectionProps {
  subscription: Subscription;
}

export function RenewalSection({ subscription }: RenewalSectionProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const modalKeyRef = useRef(0);

  const handleOpenModal = () => {
    modalKeyRef.current += 1;
    setShowPaymentModal(true);
  };

  const periodEnd = subscription.currentPeriodEnd;
  const daysLeft = periodEnd ? getDaysUntil(periodEnd) : null;

  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && !isExpired;
  const isUrgent = daysLeft !== null && daysLeft <= 3 && !isExpired;

  return (
    <>
      <Card
        className={cn(
          isExpired && "border-destructive",
          isUrgent && !isExpired && "border-orange-500",
          isExpiringSoon && !isUrgent && "border-yellow-500",
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Subscription Status
          </CardTitle>
          <CardDescription className="text-muted-foreground tracking-tighter font-mono">
            Manage your {subscription.planName} subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground tracking-tighter font-mono">
                Current Plan
              </span>
              <span className="font-medium">{subscription.planName}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground tracking-tighter font-mono">
                Status
              </span>
              <span
                className={cn(
                  "font-medium px-2 py-0.5 rounded text-sm",
                  subscription.status === "active" &&
                    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                  subscription.status === "trial" &&
                    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                  subscription.status === "expired" &&
                    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                )}
              >
                {subscription.status === "active" && "Active"}
                {subscription.status === "trial" && "Trial"}
                {subscription.status === "expired" && "Expired"}
                {subscription.status === "cancelled" && "Cancelled"}
              </span>
            </div>

            {periodEnd && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground tracking-tighter font-mono">
                  {isExpired ? "Expired on" : "Expires on"}
                </span>
                <span className="font-medium">
                  {formatDateShort(periodEnd)}
                </span>
              </div>
            )}

            {!isExpired && daysLeft !== null && (
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground tracking-tighter font-mono">
                  Days remaining
                </span>
                <span
                  className={cn(
                    "font-medium",
                    daysLeft <= 3 && "text-orange-600 dark:text-orange-400",
                    daysLeft > 3 &&
                      daysLeft <= 7 &&
                      "text-yellow-600 dark:text-yellow-400",
                  )}
                >
                  {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          <Activity mode={!isExpired ? "hidden" : "visible"}>
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                Your subscription has expired. Renew now to keep your{" "}
                {subscription.planName} features.
              </AlertDescription>
            </Alert>
          </Activity>

          <Activity mode={!isUrgent ? "hidden" : "visible"}>
            <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
              <AlertTriangle className="size-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                Your subscription expires in {daysLeft} day
                {daysLeft !== 1 ? "s" : ""}! Renew now to avoid losing access.
              </AlertDescription>
            </Alert>
          </Activity>

          <Activity mode={isExpiringSoon && !isUrgent ? "visible" : "hidden"}>
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <Clock className="size-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                Your subscription expires in {daysLeft} days. Consider renewing
                soon.
              </AlertDescription>
            </Alert>
          </Activity>

          <Button className="w-full" onClick={handleOpenModal}>
            <CreditCard className="size-4" />
            {isExpired ? "Renew Now" : "Renew Subscription"}
          </Button>
        </CardContent>
      </Card>

      <PaymentModal
        key={modalKeyRef.current}
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        planName={subscription.planName}
        billingPeriod={
          (subscription.billingPeriod as "monthly" | "yearly") || "monthly"
        }
        isRenewal={true}
        defaultPhone={subscription.phoneNumber}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}
