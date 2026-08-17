"use client";

import { Crown, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUserSubscription } from "@/hooks/use-user-subscription";

export function SubscriptionBadge() {
  const { planName, isTrial, daysUntilTrialEnd, isLoading } =
    useUserSubscription();

  if (isLoading) {
    return null;
  }

  const icon =
    planName === "Enterprise" ? (
      <Crown className="size-3" />
    ) : planName === "Pro" || planName === "Growth" ? (
      <Sparkles className="size-3" />
    ) : planName === "Starter" ? (
      <Zap className="size-3" />
    ) : null;

  const variant =
    planName === "Enterprise" || planName === "Pro" || planName === "Growth"
      ? "default"
      : planName === "Starter"
        ? "secondary"
        : "outline";

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {planName}
      {isTrial && daysUntilTrialEnd !== null && (
        <span className="text-xs opacity-80">
          (Trial: {daysUntilTrialEnd}d left)
        </span>
      )}
    </Badge>
  );
}
