"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PaymentModal } from "@/components/billing/payment-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserSubscription } from "@/hooks/use-user-subscription";
import { useSession } from "@/lib/auth-client";
import {
  ANNUAL_DISCOUNT_PERCENT,
  type BillingPeriod,
  PRICING_PLANS,
  type PricingPlan,
} from "@/lib/constants";
import { formatDateShort } from "@/lib/utils";
import {
  createSubscription,
  hasUserEverHadSubscription,
  scheduleDowngrade,
} from "@/server/subscription";
import { PricingCard } from "./pricing-card";

interface PricingGridProps {
  plans: readonly PricingPlan[];
}

function getPlanRank(planName: string | null): number {
  const ranks: Record<string, number> = {
    Starter: 0,
    Growth: 1,
    Pro: 2,
    Enterprise: 3,
  };
  return ranks[planName || ""] ?? -1;
}

export function PricingGrid({ plans }: PricingGridProps) {
  const { data: session } = useSession();
  const {
    planName: currentPlanName,
    isLoading: isLoadingSubscription,
    subscription,
    refetch,
  } = useUserSubscription();
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const isUpgrade = (targetPlan: string): boolean => {
    return getPlanRank(targetPlan) > getPlanRank(currentPlanName);
  };

  const isDowngrade = (targetPlan: string): boolean => {
    return getPlanRank(targetPlan) < getPlanRank(currentPlanName);
  };

  const handleSelectPlan = async (planName: string) => {
    if (!session?.user) {
      toast.info("Please sign in to subscribe");
      router.push("/sign-in");
      return;
    }

    if (planName === currentPlanName) {
      toast.info("You're already on this plan");
      return;
    }

    if (subscription?.scheduledPlanName) {
      toast.info(
        `You already have a plan change scheduled to ${subscription.scheduledPlanName}.`,
      );
      return;
    }

    if (planName === "Enterprise") {
      toast.info("Please contact us for Enterprise pricing");
      return;
    }

    // No current subscription - check trial eligibility
    if (!currentPlanName) {
      setLoadingPlan(planName);
      try {
        const hadSubscription = await hasUserEverHadSubscription(
          session.user.id,
        );

        if (!hadSubscription) {
          // First-time user: start free trial directly (no payment)
          await createSubscription(session.user.id, planName, billingPeriod);
          toast.success(
            `Your 14-day free trial of ${planName} has started! Enjoy all features.`,
          );
          refetch();
        } else {
          // User had a subscription before (expired/cancelled) - require payment
          setSelectedPlan(planName);
          setShowPaymentModal(true);
        }
      } catch (error) {
        console.error("Trial start error:", error);
        toast.error("Failed to start trial. Please try again.");
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    // Existing subscription - check upgrade vs downgrade
    if (isUpgrade(planName)) {
      // UPGRADE: Require payment, apply immediately
      setSelectedPlan(planName);
      setShowPaymentModal(true);
    } else if (isDowngrade(planName)) {
      // DOWNGRADE: Schedule for end of billing period
      setSelectedPlan(planName);
      setShowDowngradeDialog(true);
    }
  };

  const handleConfirmDowngrade = async () => {
    if (!session?.user || !selectedPlan) return;

    setLoadingPlan(selectedPlan);
    try {
      await scheduleDowngrade(session.user.id, selectedPlan);
      const periodEnd = subscription?.currentPeriodEnd
        ? formatDateShort(subscription.currentPeriodEnd)
        : "the end of your billing period";
      toast.success(
        `Downgrade to ${selectedPlan} scheduled. You'll keep ${currentPlanName} features until ${periodEnd}.`,
      );
      refetch();
    } catch (error) {
      console.error("Downgrade error:", error);
      toast.error("Failed to schedule downgrade. Please try again.");
    } finally {
      setLoadingPlan(null);
      setShowDowngradeDialog(false);
      setSelectedPlan(null);
    }
  };

  const handlePaymentSuccess = () => {
    refetch();
    setShowPaymentModal(false);
    setSelectedPlan(null);
    toast.success("Subscription upgraded successfully!");
  };

  const targetPlan = selectedPlan
    ? PRICING_PLANS.find(p => p.name === selectedPlan)
    : null;

  return (
    <>
      <div className="flex flex-col items-center gap-4 mt-8">
        <Tabs
          value={billingPeriod}
          onValueChange={v => setBillingPeriod(v as BillingPeriod)}
          className="w-full max-w-xs"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly" className="gap-1.5">
              Yearly
              <Badge variant="secondary" className="text-xs">
                Save {ANNUAL_DISCOUNT_PERCENT}%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 md:gap-6 mt-8">
        {plans.map(plan => (
          <PricingCard
            key={plan.name}
            plan={plan}
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan(plan.name)}
            isLoading={loadingPlan === plan.name}
            isCurrentPlan={
              !isLoadingSubscription && currentPlanName === plan.name
            }
            isScheduledPlan={subscription?.scheduledPlanName === plan.name}
          />
        ))}
      </div>

      {/* Payment Modal for Upgrades */}
      {selectedPlan && showPaymentModal && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          planName={selectedPlan}
          billingPeriod={billingPeriod}
          isRenewal={false}
          defaultPhone={subscription?.phoneNumber}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Downgrade Confirmation Dialog */}
      <AlertDialog
        open={showDowngradeDialog}
        onOpenChange={setShowDowngradeDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade to {selectedPlan}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Your plan will change to <strong>{selectedPlan}</strong> at
                  the end of your current billing period
                  {subscription?.currentPeriodEnd && (
                    <> ({formatDateShort(subscription.currentPeriodEnd)})</>
                  )}
                  .
                </p>
                <p>
                  You'll keep all your <strong>{currentPlanName}</strong>{" "}
                  features until then.
                </p>
                {targetPlan && (
                  <p className="mt-3">
                    New limits: {targetPlan.maxOrgs ?? "Unlimited"} store(s),{" "}
                    {targetPlan.maxProductsPerOrg ?? "Unlimited"} products,{" "}
                    {targetPlan.orderLimit ?? "Unlimited"} orders/month
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPlan(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDowngrade}>
              Confirm Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
