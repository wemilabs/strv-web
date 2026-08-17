import { useEffect, useState } from "react";
import type { Subscription } from "@/db/schema";
import { useSession } from "@/lib/auth-client";
import type { PRICING_PLANS } from "@/lib/constants";
import { getUserSubscription } from "@/server/subscription";

type SubscriptionWithPlan = Subscription & {
  plan: (typeof PRICING_PLANS)[number] | undefined;
};

export function useUserSubscription() {
  const { data: session } = useSession();
  const user = session?.user;
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const refetch = () => {
    if (!user) return;

    setIsLoading(true);
    getUserSubscription(user.id)
      .then(sub => {
        setSubscription(sub);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    getUserSubscription(user.id)
      .then(sub => {
        setSubscription(sub);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user]);

  const isActive = subscription?.status === "active";
  const isTrial = subscription?.status === "trial";
  const isCancelled = subscription?.status === "cancelled";
  const isExpired = subscription?.status === "expired";

  const daysUntilTrialEnd =
    subscription?.trialEndsAt && isTrial
      ? Math.ceil(
          (new Date(subscription.trialEndsAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  return {
    subscription,
    plan: subscription?.plan,
    isLoading,
    isActive,
    isTrial,
    isCancelled,
    isExpired,
    daysUntilTrialEnd,
    planName: subscription?.planName || null,
    refetch,
  };
}
