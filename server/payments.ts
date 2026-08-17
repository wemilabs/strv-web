"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import { order, payment, subscription } from "@/db/schema";
import { type BillingPeriod, PRICING_PLANS } from "@/lib/constants";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  getTransactionEvents,
  initiateCashout as paypackCashout,
  initiatePayment as paypackInitiate,
} from "@/lib/paypack";
import { realtime } from "@/lib/realtime";
import {
  calculateOrderFees,
  calculateSubscriptionFees,
  convertUsdToRwf,
  formatRwandanPhone,
} from "@/lib/utils";
import { createNotification } from "./push-notifications";

export async function initiateSubscriptionPayment(data: {
  planName: string;
  phoneNumber: string;
  billingPeriod: BillingPeriod;
  isRenewal: boolean;
}) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  const { session } = verified;

  const plan = PRICING_PLANS.find(p => p.name === data.planName);
  const priceUSD =
    data.billingPeriod === "yearly" ? plan?.yearlyPrice : plan?.monthlyPrice;
  if (!plan || priceUSD === null || priceUSD === 0)
    return { error: "Invalid plan" };

  try {
    const phone = formatRwandanPhone(data.phoneNumber);
    const baseAmountRWF = convertUsdToRwf(priceUSD as number);
    const fees = calculateSubscriptionFees(baseAmountRWF);

    const result = await paypackInitiate(phone, fees.totalAmount);

    // Create payment record with encrypted sensitive data
    const [newPayment] = await db
      .insert(payment)
      .values({
        userId: session.user.id,
        phoneNumber: encrypt(phone),
        amount: encrypt(String(fees.totalAmount)),
        baseAmount: encrypt(String(fees.baseAmount)),
        paypackFee: encrypt(String(fees.paypackFee)),
        platformFee: encrypt(String(fees.platformFee)),
        currency: "RWF",
        kind: "CASHIN",
        planName: data.planName,
        billingPeriod: data.billingPeriod,
        isRenewal: data.isRenewal,
        paypackRef: result.ref,
        status: "pending",
      })
      .returning();

    // Store phone number on subscription for future reminders
    const existingSub = await db.query.subscription.findFirst({
      where: (s, { eq }) => eq(s.userId, session.user.id),
    });

    if (existingSub) {
      await db
        .update(subscription)
        .set({ phoneNumber: encrypt(phone) })
        .where(eq(subscription.userId, session.user.id));
    }

    return {
      paymentId: newPayment.id,
      paypackRef: result.ref,
      status: "pending",
      message: "Please approve the payment on your phone",
    };
  } catch (error) {
    console.error("Payment initiation failed:", error);
    return { error: "Failed to initiate payment. Please try again." };
  }
}

export async function checkPaymentStatus(paypackRef: string) {
  const verified = await verifySession();
  if (!verified.success) return { status: "error", error: "Unauthorized" };

  const existingPayment = await db.query.payment.findFirst({
    where: (p, { eq }) => eq(p.paypackRef, paypackRef),
  });

  if (!existingPayment) return { error: "Payment not found", status: "error" };

  // If already processed, return current status
  if (existingPayment.status !== "pending")
    return { status: existingPayment.status };

  // Check with Paypack
  try {
    const events = await getTransactionEvents(paypackRef);
    const latestEvent = events[0];

    if (!latestEvent) return { status: "pending" };

    const transactionStatus = latestEvent.data?.status;

    if (transactionStatus === "successful") {
      await processSuccessfulPayment(existingPayment);
      return { status: "successful" };
    }

    if (transactionStatus === "failed") {
      await db
        .update(payment)
        .set({ status: "failed" })
        .where(eq(payment.id, existingPayment.id));
      return { status: "failed" };
    }

    return { status: "pending" };
  } catch (error) {
    console.error("Status check failed:", error);
    return { status: "pending" };
  }
}

async function processSuccessfulPayment(
  paymentRecord: typeof payment.$inferSelect,
) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  if (!paymentRecord.planName) return;

  const plan = PRICING_PLANS.find(p => p.name === paymentRecord.planName);
  if (!plan) return;

  const billingPeriod =
    (paymentRecord.billingPeriod as BillingPeriod) || "monthly";
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingPeriod === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Update payment status
  await db
    .update(payment)
    .set({
      status: "successful",
      processedAt: now,
    })
    .where(eq(payment.id, paymentRecord.id));

  // Update or create subscription
  const existingSub = await db.query.subscription.findFirst({
    where: (s, { eq }) => eq(s.userId, paymentRecord.userId),
  });

  if (existingSub) {
    await db
      .update(subscription)
      .set({
        planName: paymentRecord.planName,
        billingPeriod,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        lastPaymentId: paymentRecord.id,
        orderLimit: plan.orderLimit,
        maxOrgs: plan.maxOrgs,
        maxProductsPerOrg: plan.maxProductsPerOrg,
        trialEndsAt: null,
        renewalReminderSentAt: null,
        finalReminderSentAt: null,
        updatedAt: now,
      })
      .where(eq(subscription.userId, paymentRecord.userId));
  } else {
    await db.insert(subscription).values({
      userId: paymentRecord.userId,
      planName: paymentRecord.planName,
      billingPeriod,
      status: "active",
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      lastPaymentId: paymentRecord.id,
      orderLimit: plan.orderLimit,
      maxOrgs: plan.maxOrgs,
      maxProductsPerOrg: plan.maxProductsPerOrg,
      phoneNumber: paymentRecord.phoneNumber,
    });
  }

  // Create notification
  await createNotification({
    userId: paymentRecord.userId,
    type: "payment_successful",
    title: "Payment Successful! 🎉",
    message: `Your ${
      paymentRecord.planName
    } subscription is now active until ${periodEnd.toLocaleDateString()}.`,
    actionUrl: "/usage/billing",
    sendPush: true,
  });

  revalidatePath("/usage/billing");
  revalidatePath("/usage/pricing");
}

export async function getUserPayments(limit = 10) {
  const verified = await verifySession();
  if (!verified.success) return [];

  const { session } = verified;

  const payments = await db.query.payment.findMany({
    where: (p, { eq }) => eq(p.userId, session.user.id),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
    limit,
  });

  return payments.map(p => ({
    ...p,
    amount: decrypt(p.amount),
    phoneNumber: decrypt(p.phoneNumber),
    baseAmount: p.baseAmount ? decrypt(p.baseAmount) : null,
    paypackFee: p.paypackFee ? decrypt(p.paypackFee) : null,
    platformFee: p.platformFee ? decrypt(p.platformFee) : null,
  }));
}

export async function getPaymentByRef(paypackRef: string) {
  return db.query.payment.findFirst({
    where: (p, { eq }) => eq(p.paypackRef, paypackRef),
  });
}

export async function initiateOrderPayment(data: {
  orderId: string;
  phoneNumber: string;
}) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  const { session } = verified;

  const order = await db.query.order.findFirst({
    where: (o, { eq }) => eq(o.id, data.orderId),
    with: {
      organization: true,
    },
  });

  if (!order) return { error: "Order not found" };
  if (order.userId !== session.user.id) return { error: "Unauthorized" };

  try {
    const phone = formatRwandanPhone(data.phoneNumber);
    const baseAmountRWF = Number(decrypt(order.totalPrice));
    const fees = calculateOrderFees(baseAmountRWF);

    const result = await paypackInitiate(phone, fees.totalAmount);

    const [newPayment] = await db
      .insert(payment)
      .values({
        userId: session.user.id,
        organizationId: order.organizationId,
        phoneNumber: encrypt(phone),
        amount: encrypt(String(fees.totalAmount)),
        baseAmount: encrypt(String(fees.baseAmount)),
        paypackFee: encrypt(String(fees.paypackFee)),
        platformFee: encrypt(String(fees.platformFee)),
        currency: "RWF",
        kind: "CASHIN",
        planName: null,
        billingPeriod: null,
        isRenewal: false,
        paypackRef: result.ref,
        status: "pending",
        orderId: data.orderId,
      })
      .returning();

    return {
      paymentId: newPayment.id,
      paypackRef: result.ref,
      status: "pending",
      message: "Please approve the payment on your phone",
    };
  } catch (error) {
    console.error("Order payment initiation failed:", error);
    return { error: "Failed to initiate payment. Please try again." };
  }
}

export async function checkOrderPaymentStatus(paypackRef: string) {
  const verified = await verifySession();
  if (!verified.success) return { status: "error", error: "Unauthorized" };

  const existingPayment = await db.query.payment.findFirst({
    where: (p, { eq }) => eq(p.paypackRef, paypackRef),
  });

  if (!existingPayment) return { error: "Payment not found", status: "error" };

  if (existingPayment.status !== "pending")
    return { status: existingPayment.status };

  try {
    const events = await getTransactionEvents(paypackRef);
    const latestEvent = events[0];

    if (!latestEvent) return { status: "pending" };

    const transactionStatus = latestEvent.data?.status;

    if (transactionStatus === "successful") {
      const now = new Date();

      await db
        .update(payment)
        .set({
          status: "successful",
          processedAt: now,
        })
        .where(eq(payment.id, existingPayment.id));

      if (existingPayment.orderId) {
        const paidOrder = await db.query.order.findFirst({
          where: (o, { eq }) => eq(o.id, existingPayment.orderId as string),
          with: {
            user: true,
          },
        });

        if (paidOrder) {
          await db
            .update(order)
            .set({
              isPaid: true,
              paidAt: now,
              updatedAt: now,
            })
            .where(eq(order.id, existingPayment.orderId));

          await realtime
            .channel(`org:${paidOrder.organizationId}`)
            .emit("orders.paid", {
              orderId: paidOrder.id,
              orderNumber: paidOrder.orderNumber,
              customerName: paidOrder.user.name,
              total: decrypt(paidOrder.totalPrice),
              organizationId: paidOrder.organizationId,
              paidAt: now.toISOString(),
            });
        }
      }

      revalidatePath(`/point-of-sales/orders/${existingPayment.orderId}`);
      return { status: "successful" };
    }

    if (transactionStatus === "failed") {
      await db
        .update(payment)
        .set({ status: "failed" })
        .where(eq(payment.id, existingPayment.id));
      return { status: "failed" };
    }

    return { status: "pending" };
  } catch (error) {
    console.error("Order payment status check failed:", error);
    return { status: "pending" };
  }
}

export async function initiateMerchantWithdrawal(data: {
  organizationId: string;
  amount: number;
  orderId?: string;
}) {
  const verified = await verifySession();
  if (!verified.success) return { error: "Unauthorized" };

  const { session } = verified;

  const org = await db.query.organization.findFirst({
    where: (o, { eq }) => eq(o.id, data.organizationId),
  });

  if (!org) return { error: "Organization not found" };

  const metadata = org.metadata
    ? typeof org.metadata === "string"
      ? JSON.parse(org.metadata)
      : org.metadata
    : {};

  const merchantPhone = metadata.phoneForPayments;
  if (!merchantPhone) {
    return { error: "Merchant payment phone not configured" };
  }

  try {
    const phone = formatRwandanPhone(merchantPhone);
    const result = await paypackCashout(phone, data.amount);

    const [newPayment] = await db
      .insert(payment)
      .values({
        userId: session.user.id,
        organizationId: data.organizationId,
        phoneNumber: encrypt(phone),
        amount: encrypt(String(data.amount)),
        currency: "RWF",
        kind: "CASHOUT",
        paypackRef: result.ref,
        status: "pending",
        orderId: data.orderId ?? null,
      })
      .returning();

    return {
      paymentId: newPayment.id,
      paypackRef: result.ref,
      status: "pending",
      message: "Withdrawal initiated",
    };
  } catch (error) {
    console.error("Merchant withdrawal failed:", error);
    return { error: "Failed to initiate withdrawal. Please try again." };
  }
}

export async function checkCashoutStatus(paypackRef: string) {
  const verified = await verifySession();
  if (!verified.success) return { error: "Unauthorized" };

  const existingPayment = await db.query.payment.findFirst({
    where: (p, { eq, and }) =>
      and(eq(p.paypackRef, paypackRef), eq(p.kind, "CASHOUT")),
  });

  if (!existingPayment) return { error: "Cashout not found", status: "error" };

  if (existingPayment.status !== "pending") {
    return { status: existingPayment.status };
  }

  try {
    const events = await getTransactionEvents(paypackRef);
    const latestEvent = events[0];

    if (!latestEvent) return { status: "pending" };

    const transactionStatus = latestEvent.data?.status;

    if (transactionStatus === "successful") {
      await db
        .update(payment)
        .set({ status: "successful", processedAt: new Date() })
        .where(eq(payment.id, existingPayment.id));
      return { status: "successful" };
    }

    if (transactionStatus === "failed") {
      await db
        .update(payment)
        .set({ status: "failed" })
        .where(eq(payment.id, existingPayment.id));
      return { status: "failed" };
    }

    return { status: "pending" };
  } catch (error) {
    console.error("Cashout status check failed:", error);
    return { status: "pending" };
  }
}
