import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Crown,
  History,
  Lock,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Activity } from "react";
import { NotificationToggle } from "@/components/billing/notification-toggle";
import { RenewalSection } from "@/components/billing/renewal-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import { getUserPayments } from "@/server/payments";
import {
  checkOrderLimit,
  checkOrganizationLimit,
  checkProductLimit,
  getUserSubscription,
} from "@/server/subscription";

export async function BillingContent() {
  const sessionData = await verifySession();

  if (!sessionData.success || !sessionData.session)
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lock className="size-6" />
          </EmptyMedia>
          <EmptyTitle>You are not yet signed in</EmptyTitle>
          <EmptyDescription className="font-mono tracking-tighter">
            Sign in first to access this service
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm" className="w-full">
            <Link href="/sign-in">
              <span>Sign In</span>
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );

  const subscription = await getUserSubscription(sessionData.session.user.id);

  const organizationLimit = await checkOrganizationLimit(
    sessionData.session.user.id,
  );

  // Get user's organizations to check product and order limits
  const userOrgs = await db.query.member.findMany({
    where: (member, { eq }) => eq(member.userId, sessionData.session.user.id),
  });

  const plan = subscription?.plan;
  const isAdmin = organizationLimit.planName === "Admin";

  // Get product and order limits for the first organization
  let productLimit = {
    canCreate: true,
    maxProducts: isAdmin
      ? "Unlimited"
      : ((plan?.maxProductsPerOrg === null
          ? "Unlimited"
          : (plan?.maxProductsPerOrg ?? 10)) as number | string),
    currentProducts: 0,
    planName: isAdmin ? "Admin" : (plan?.name ?? null),
  };
  let orderLimit = {
    canCreate: true,
    maxOrders: isAdmin
      ? "Unlimited"
      : ((plan?.orderLimit === null ? "Unlimited" : (plan?.orderLimit ?? 50)) as
          | number
          | string),
    currentOrders: 0,
    planName: isAdmin ? "Admin" : (plan?.name ?? null),
  };

  if (userOrgs.length > 0) {
    const firstOrgId = userOrgs[0].organizationId;
    const productResult = await checkProductLimit(firstOrgId);
    const orderResult = await checkOrderLimit(firstOrgId);

    productLimit = {
      canCreate: productResult.canCreate,
      maxProducts: productResult.maxProducts,
      currentProducts: productResult.currentProducts,
      planName: productResult.planName,
    };
    orderLimit = {
      canCreate: orderResult.canCreate,
      maxOrders: orderResult.maxOrders,
      currentOrders: orderResult.currentOrders,
      planName: orderResult.planName,
    };
  }

  const isTrial = subscription?.status === "trial";
  const payments = await getUserPayments(5);

  const isOverLimit =
    (organizationLimit.maxOrgs !== "Unlimited" &&
      typeof organizationLimit.maxOrgs === "number" &&
      (organizationLimit.currentOrgs / organizationLimit.maxOrgs) * 100 > 90) ||
    (productLimit.maxProducts !== "Unlimited" &&
      typeof productLimit.maxProducts === "number" &&
      (productLimit.currentProducts / productLimit.maxProducts) * 100 > 90) ||
    (orderLimit.maxOrders !== "Unlimited" &&
      typeof orderLimit.maxOrders === "number" &&
      (orderLimit.currentOrders / orderLimit.maxOrders) * 100 > 90);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  const formatLimit = (value: number | string) => {
    return value === "Unlimited" ? "Unlimited" : value.toString();
  };

  const calculatePercentage = (current: number, max: number | string) => {
    if (max === "Unlimited") return 0;
    return Math.round((current / (max as number)) * 100);
  };

  const orgPercentage = calculatePercentage(
    organizationLimit.currentOrgs,
    organizationLimit.maxOrgs,
  );
  const productPercentage = calculatePercentage(
    productLimit.currentProducts,
    productLimit.maxProducts,
  );
  const orderPercentage = calculatePercentage(
    orderLimit.currentOrders,
    orderLimit.maxOrders,
  );

  return (
    <div className="space-y-7">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Crown className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>
                  {organizationLimit.planName === "Admin"
                    ? "Unlimited access"
                    : isTrial
                      ? "Trial period"
                      : subscription
                        ? "Active subscription"
                        : "No active plan"}
                </CardDescription>
              </div>
            </div>
            <Badge variant={plan?.highlighted ? "default" : "secondary"}>
              {organizationLimit.planName === "Admin"
                ? "Admin"
                : plan?.name || "No Plan"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:flex md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium">Monthly Price</p>
              <p className="text-2xl font-bold">
                {plan?.monthlyPrice ? `$${plan.monthlyPrice}` : "—"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {subscription?.status === "active" || isAdmin ? (
                  <CheckCircle2 className="size-4 text-green-600" />
                ) : (
                  <AlertCircle className="size-4 text-yellow-600" />
                )}
                <span className="text-sm capitalize">
                  {isAdmin
                    ? "Active"
                    : subscription?.status || "No subscription"}
                  {isTrial && " (14 days)"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">Billing Period</p>
              <p className="text-sm mt-1 capitalize">
                {subscription?.billingPeriod || "—"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Started On</p>
              <p className="text-sm mt-1">
                {subscription?.startDate
                  ? new Date(subscription.startDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Expires On</p>
              <p className="text-sm mt-1">
                {isAdmin
                  ? "Never"
                  : isTrial && subscription?.trialEndsAt
                    ? new Date(subscription.trialEndsAt).toLocaleDateString()
                    : subscription?.currentPeriodEnd
                      ? new Date(
                          subscription.currentPeriodEnd,
                        ).toLocaleDateString()
                      : "—"}
              </p>
            </div>
          </div>

          {plan?.features && (
            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Plan Features</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {plan.features.map(feature => (
                  <div
                    key={`feature-${feature}-${feature.replace(/\s+/g, "-")}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="size-3 text-green-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Organizations Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">
                Organizations
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {organizationLimit.currentOrgs}
                </span>
                <span className="text-sm text-muted-foreground">
                  of {formatLimit(organizationLimit.maxOrgs)}
                </span>
              </div>
              <Progress value={orgPercentage} className="h-2" />
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${getStatusColor(
                    orgPercentage,
                  )}`}
                >
                  {orgPercentage}% used
                </span>
                {organizationLimit.canCreate ? (
                  <span className="text-xs text-green-600">Can create</span>
                ) : (
                  <span className="text-xs text-destructive">
                    Limit reached
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">
                Products per Org
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {productLimit.currentProducts}
                </span>
                <span className="text-sm text-muted-foreground">
                  of {formatLimit(productLimit.maxProducts)}
                </span>
              </div>
              <Progress value={productPercentage} className="h-2" />
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${getStatusColor(
                    productPercentage,
                  )}`}
                >
                  {productPercentage}% used
                </span>
                {productLimit.canCreate ? (
                  <span className="text-xs text-green-600">Can create</span>
                ) : (
                  <span className="text-xs text-destructive">
                    Limit reached
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">
                Orders This Month
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {orderLimit.currentOrders}
                </span>
                <span className="text-sm text-muted-foreground">
                  of {formatLimit(orderLimit.maxOrders)}
                </span>
              </div>
              <Progress value={orderPercentage} className="h-2" />
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${getStatusColor(
                    orderPercentage,
                  )}`}
                >
                  {orderPercentage}% used
                </span>
                {orderLimit.canCreate ? (
                  <span className="text-xs text-green-600">Can receive</span>
                ) : (
                  <span className="text-xs text-destructive">
                    Limit reached
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Actions */}
      <Activity mode={isOverLimit ? "visible" : "hidden"}>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-900">
                  Approaching Usage Limits
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  You're approaching the limits of your current plan. Upgrade to
                  continue growing your business without interruptions.
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    size="sm"
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <TrendingUp className="size-4" />
                    Upgrade Plan
                  </Button>
                  <Button variant="outline" size="sm">
                    View Pricing
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Activity>

      {/* Renewal Section */}
      {subscription && <RenewalSection subscription={subscription} />}

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Payment History</CardTitle>
                <CardDescription>
                  Your recent subscription payments
                </CardDescription>
              </div>
              <NotificationToggle />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map(payment => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-2 rounded-full ${
                        payment.status === "successful"
                          ? "bg-green-500"
                          : payment.status === "pending"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {payment.planName} Plan
                        {payment.isRenewal && " (Renewal)"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {Number(payment.amount).toLocaleString()}{" "}
                      {payment.currency}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {payment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>
                Manage your subscription and billing settings
              </CardDescription>
            </div>
            {payments.length === 0 && <NotificationToggle />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" asChild>
              <Link href="/usage/pricing">
                <TrendingUp className="size-4" />
                Upgrade Plan
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/usage/pricing">
                <Crown className="size-4" />
                View Plans
              </Link>
            </Button>
            <Button variant="outline" disabled>
              <History className="size-4" />
              Full History
            </Button>
            <Button variant="outline" disabled>
              <Package className="size-4" />
              Usage Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
