"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/drizzle";
import { subscription } from "@/db/schema";
import { type BillingPeriod, PRICING_PLANS } from "@/lib/constants";

async function isUserAdmin(userId: string): Promise<boolean> {
  const userData = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: { role: true },
  });
  return userData?.role === "admin";
}

export async function getUserSubscription(userId: string) {
  const [currentSubscription] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .orderBy(desc(subscription.createdAt))
    .limit(1);

  if (!currentSubscription) return null;

  const plan = PRICING_PLANS.find(p => p.name === currentSubscription.planName);

  return {
    ...currentSubscription,
    plan,
  };
}

export async function hasUserEverHadSubscription(
  userId: string,
): Promise<boolean> {
  const existingSub = await db.query.subscription.findFirst({
    where: (s, { eq }) => eq(s.userId, userId),
    columns: { id: true },
  });
  return !!existingSub;
}

export async function createSubscription(
  userId: string,
  planName: string,
  billingPeriod: BillingPeriod = "monthly",
) {
  const plan = PRICING_PLANS.find(p => p.name === planName);
  if (!plan) throw new Error(`Invalid plan name: ${planName}`);

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const [newSubscription] = await db
    .insert(subscription)
    .values({
      userId,
      planName,
      billingPeriod,
      status: "trial",
      trialEndsAt,
      startDate: new Date(),
      orderLimit: plan.orderLimit,
      maxOrgs: plan.maxOrgs,
      maxProductsPerOrg: plan.maxProductsPerOrg,
    })
    .returning();

  return newSubscription;
}

export async function updateSubscription(
  userId: string,
  planName: string,
  billingPeriod?: BillingPeriod,
) {
  const existingSubscription = await getUserSubscription(userId);
  const plan = PRICING_PLANS.find(p => p.name === planName);
  if (!plan) throw new Error(`Invalid plan name: ${planName}`);

  if (!existingSubscription)
    return createSubscription(userId, planName, billingPeriod);

  const [updatedSubscription] = await db
    .update(subscription)
    .set({
      planName,
      ...(billingPeriod && { billingPeriod }),
      orderLimit: plan.orderLimit,
      maxOrgs: plan.maxOrgs,
      maxProductsPerOrg: plan.maxProductsPerOrg,
      updatedAt: new Date(),
    })
    .where(eq(subscription.userId, userId))
    .returning();

  revalidatePath("/usage/pricing");

  return updatedSubscription;
}

export async function cancelSubscription(userId: string) {
  const [cancelledSubscription] = await db
    .update(subscription)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscription.userId, userId))
    .returning();

  revalidatePath("/usage/pricing");

  return cancelledSubscription;
}

export async function activateSubscription(userId: string) {
  const [activatedSubscription] = await db
    .update(subscription)
    .set({
      status: "active",
      trialEndsAt: null,
      updatedAt: new Date(),
    })
    .where(eq(subscription.userId, userId))
    .returning();

  revalidatePath("/usage/pricing");

  return activatedSubscription;
}

export async function scheduleDowngrade(userId: string, newPlanName: string) {
  const existingSubscription = await getUserSubscription(userId);
  if (!existingSubscription) {
    throw new Error("No subscription found");
  }

  const plan = PRICING_PLANS.find(p => p.name === newPlanName);
  if (!plan) throw new Error(`Invalid plan name: ${newPlanName}`);

  // Schedule the downgrade for the end of the current billing period
  const scheduledDate = existingSubscription.currentPeriodEnd || new Date();

  const [updatedSubscription] = await db
    .update(subscription)
    .set({
      scheduledPlanName: newPlanName,
      scheduledChangeDate: scheduledDate,
      updatedAt: new Date(),
    })
    .where(eq(subscription.userId, userId))
    .returning();

  revalidatePath("/usage/pricing");
  revalidatePath("/usage/billing");

  return updatedSubscription;
}

export async function cancelScheduledDowngrade(userId: string) {
  const [updatedSubscription] = await db
    .update(subscription)
    .set({
      scheduledPlanName: null,
      scheduledChangeDate: null,
      updatedAt: new Date(),
    })
    .where(eq(subscription.userId, userId))
    .returning();

  revalidatePath("/usage/pricing");
  revalidatePath("/usage/billing");

  return updatedSubscription;
}

export async function applyScheduledDowngrades() {
  const now = new Date();

  // Find all subscriptions with scheduled changes that are due
  const dueDowngrades = await db.query.subscription.findMany({
    where: (s, { and, isNotNull, lte }) =>
      and(isNotNull(s.scheduledPlanName), lte(s.scheduledChangeDate, now)),
  });

  for (const sub of dueDowngrades) {
    if (!sub.scheduledPlanName) continue;

    const plan = PRICING_PLANS.find(p => p.name === sub.scheduledPlanName);
    if (!plan) continue;

    await db
      .update(subscription)
      .set({
        planName: sub.scheduledPlanName,
        orderLimit: plan.orderLimit,
        maxOrgs: plan.maxOrgs,
        maxProductsPerOrg: plan.maxProductsPerOrg,
        scheduledPlanName: null,
        scheduledChangeDate: null,
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, sub.id));
  }

  return dueDowngrades.length;
}

export async function checkOrganizationLimit(userId: string) {
  const userOrgs = await db.query.member.findMany({
    where: (member, { eq }) => eq(member.userId, userId),
  });
  const totalOrgs = userOrgs.length;

  // Admin bypass - unlimited access
  if (await isUserAdmin(userId)) {
    return {
      canCreate: true,
      maxOrgs: "Unlimited",
      currentOrgs: totalOrgs,
      planName: "Admin",
    };
  }

  const userSub = await getUserSubscription(userId);
  const starterPlan = PRICING_PLANS.find(p => p.name === "Starter");
  const defaultMaxOrgs = starterPlan?.maxOrgs ?? 3;

  if (
    !userSub ||
    userSub.status === "cancelled" ||
    userSub.status === "expired"
  )
    return {
      canCreate: false,
      maxOrgs: 0,
      currentOrgs: totalOrgs,
      planName: null,
      noSubscription: true,
    };

  const plan = userSub.plan;
  const maxOrgs = plan !== undefined ? plan?.maxOrgs : defaultMaxOrgs;

  return {
    canCreate: maxOrgs === null || totalOrgs < (maxOrgs ?? 0),
    maxOrgs: maxOrgs === null ? "Unlimited" : (maxOrgs ?? defaultMaxOrgs),
    currentOrgs: totalOrgs,
    planName: plan?.name || null,
  };
}

export async function checkProductLimit(organizationId: string) {
  const currentProducts = await db.query.product.findMany({
    where: (product, { eq }) => eq(product.organizationId, organizationId),
  });
  const totalProducts = currentProducts.length;

  const orgOwner = await db.query.member.findFirst({
    where: (member, { eq }) => eq(member.organizationId, organizationId),
    with: {
      user: true,
    },
  });

  if (!orgOwner)
    return {
      canCreate: false,
      maxProducts: 0,
      currentProducts: totalProducts,
      planName: null,
    };

  // Admin bypass - unlimited access
  if (await isUserAdmin(orgOwner.userId)) {
    return {
      canCreate: true,
      maxProducts: "Unlimited",
      currentProducts: totalProducts,
      planName: "Admin",
    };
  }

  const starterPlan = PRICING_PLANS.find(p => p.name === "Starter");
  const defaultMaxProducts = starterPlan?.maxProductsPerOrg ?? 30;
  const userSub = await getUserSubscription(orgOwner.userId);

  if (
    !userSub ||
    userSub.status === "cancelled" ||
    userSub.status === "expired"
  )
    return {
      canCreate: false,
      maxProducts: 0,
      currentProducts: totalProducts,
      planName: null,
    };

  const plan = userSub.plan;
  const maxProductsPerOrg =
    plan !== undefined ? plan?.maxProductsPerOrg : defaultMaxProducts;

  return {
    canCreate:
      maxProductsPerOrg === null || totalProducts < (maxProductsPerOrg ?? 0),
    maxProducts:
      maxProductsPerOrg === null
        ? "Unlimited"
        : (maxProductsPerOrg ?? defaultMaxProducts),
    currentProducts: totalProducts,
    planName: plan?.name || null,
  };
}

export async function checkOrderLimit(organizationId: string) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const orderUsage = await db.query.orderUsageTracking.findFirst({
    where: (tracking, { eq, and }) =>
      and(
        eq(tracking.organizationId, organizationId),
        eq(tracking.monthYear, currentMonth),
      ),
  });

  const currentOrders = orderUsage?.orderCount || 0;

  const orgOwner = await db.query.member.findFirst({
    where: (member, { eq }) => eq(member.organizationId, organizationId),
    with: {
      user: true,
    },
  });

  if (!orgOwner)
    return {
      canCreate: false,
      maxOrders: 0,
      currentOrders,
      planName: null,
    };

  // Admin bypass - unlimited access
  if (await isUserAdmin(orgOwner.userId)) {
    return {
      canCreate: true,
      maxOrders: "Unlimited",
      currentOrders,
      planName: "Admin",
    };
  }

  const starterPlan = PRICING_PLANS.find(p => p.name === "Starter");
  const defaultMaxOrders = starterPlan?.orderLimit ?? 200;
  const userSub = await getUserSubscription(orgOwner.userId);

  if (
    !userSub ||
    userSub.status === "cancelled" ||
    userSub.status === "expired"
  )
    return {
      canCreate: false,
      maxOrders: 0,
      currentOrders,
      planName: null,
    };

  const plan = userSub.plan;
  const maxOrders = plan !== undefined ? plan?.orderLimit : defaultMaxOrders;

  return {
    canCreate: maxOrders === null || currentOrders < (maxOrders ?? 0),
    maxOrders:
      maxOrders === null ? "Unlimited" : (maxOrders ?? defaultMaxOrders),
    currentOrders,
    planName: plan?.name || null,
  };
}
