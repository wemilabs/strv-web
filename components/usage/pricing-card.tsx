import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type BillingPeriod,
  getMonthlyEquivalent,
  getPlanPrice,
  type PricingPlan,
} from "@/lib/constants";
import { cn, formatPrice } from "@/lib/utils";
import { Spinner } from "../ui/spinner";

interface PricingCardProps {
  plan: PricingPlan;
  billingPeriod: BillingPeriod;
  onSelect?: () => void;
  isLoading?: boolean;
  isCurrentPlan?: boolean;
  isScheduledPlan?: boolean;
}

export function PricingCard({
  plan,
  billingPeriod,
  onSelect,
  isLoading = false,
  isCurrentPlan = false,
  isScheduledPlan = false,
}: PricingCardProps) {
  const { name, additionalText, features, highlighted, cta } = plan;
  const price = getPlanPrice(plan, billingPeriod);
  const monthlyEquivalent = getMonthlyEquivalent(plan, billingPeriod);
  const isYearly = billingPeriod === "yearly";
  const period = isYearly ? "year" : "month";

  return (
    <Card
      className={cn(
        "relative flex flex-col h-full transition-all duration-300 hover:shadow-lg",
        highlighted && "border-primary shadow-lg ring-2 ring-primary/20",
      )}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge className="gap-1 px-3 py-1 text-xs font-semibold">
            <Sparkles className="size-3" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center">
        <CardTitle className="text-xl font-medium">{name}</CardTitle>
        <div className="mt-4 flex flex-col items-center gap-1">
          {isYearly && monthlyEquivalent && (
            <p className="text-sm text-muted-foreground">
              {formatPrice(monthlyEquivalent)}/month
            </p>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-medium tracking-tight">
              {price === null ? "From $499" : formatPrice(price)}
            </span>
            {price !== null && (
              <span className="text-muted-foreground font-mono tracking-tighter">
                /{period}
              </span>
            )}
          </div>
          {isYearly && price && (
            <p className="text-xs text-muted-foreground mt-1 font-mono tracking-tighter">
              Billed annually
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-6 border-t">
        <p className="text-sm text-muted-foreground font-mono tracking-tighter">
          {additionalText}
        </p>
        <ul className="mt-6 space-y-2">
          {features.map(feature => (
            <li key={feature} className="flex items-start gap-2">
              <Check
                className={cn(
                  "size-5 shrink-0 mt-0.5",
                  highlighted ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="text-sm tracking-wide">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-6">
        <Button
          className="w-full"
          size="lg"
          variant={highlighted ? "default" : "outline"}
          onClick={onSelect}
          disabled={isLoading || isCurrentPlan || isScheduledPlan}
        >
          {isCurrentPlan ? (
            "Current Plan"
          ) : isScheduledPlan ? (
            "Scheduled ✓"
          ) : isLoading ? (
            <>
              <Spinner />
              Processing...
            </>
          ) : (
            cta
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
