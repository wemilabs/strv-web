import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { type Payment, payment, subscription } from "@/db/schema";
import { PRICING_PLANS } from "@/lib/constants";
import { decrypt } from "@/lib/encryption";
import { createNotification } from "@/server/push-notifications";

type PaypackWebhookEvent = {
  event_id: string;
  event_kind: "transaction:processed" | "transaction:created";
  created_at: string;
  data: {
    ref: string;
    kind: "CASHIN" | "CASHOUT";
    fee: number;
    merchant: string;
    client: string;
    amount: number;
    status: "pending" | "successful" | "failed";
    created_at: string;
    processed_at?: string;
  };
};

// Verify webhook signature if secret is configured
function verifyWebhookSignature(
  _payload: string, // Will be used for HMAC verification if Paypack supports it
  signature: string | null,
): boolean {
  const secret = process.env.PAYPACK_WEBHOOK_SECRET_KEY;

  if (!secret) {
    console.warn(
      "[Paypack Webhook] No PAYPACK_WEBHOOK_SECRET_KEY configured - skipping verification",
    );
    return true;
  }

  if (!signature) {
    console.error("[Paypack Webhook] Missing signature header");
    return false;
  }

  return signature === secret;
}

export async function POST(request: Request) {
  console.log("[Paypack Webhook] Received request");

  try {
    const body = await request.text();
    const signature = request.headers.get("x-paypack-signature");

    // Verify signature if secret is configured
    if (!verifyWebhookSignature(body, signature)) {
      console.error("[Paypack Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: PaypackWebhookEvent = JSON.parse(body);
    console.log("[Paypack Webhook] Event:", event.event_kind, event.data.ref);

    const { ref, status, kind } = event.data;

    // Find payment by Paypack ref
    const existingPayment = await db.query.payment.findFirst({
      where: (p, { eq }) => eq(p.paypackRef, ref),
    });

    if (!existingPayment) {
      console.log("[Paypack Webhook] Payment not found for ref:", ref);
      return NextResponse.json({ received: true, notFound: true });
    }

    // Already processed
    if (existingPayment.status !== "pending")
      return NextResponse.json({ received: true, alreadyProcessed: true });

    if (kind === "CASHIN") {
      if (status === "successful") {
        await processSuccessfulCashin(existingPayment);
      } else if (status === "failed") {
        await processFailedCashin(existingPayment);
      }
    } else if (kind === "CASHOUT") {
      if (status === "successful") {
        await processSuccessfulCashout(existingPayment);
      } else if (status === "failed") {
        await processFailedCashout(existingPayment);
      }
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function processSuccessfulCashin(paymentRecord: Payment) {
  const now = new Date();

  await db
    .update(payment)
    .set({
      status: "successful",
      processedAt: now,
    })
    .where(eq(payment.id, paymentRecord.id));

  if (paymentRecord.planName) {
    await processSubscriptionPayment(paymentRecord, now);
  } else if (paymentRecord.orderId) {
    await processOrderPayment(paymentRecord);
  }
}

async function processSubscriptionPayment(paymentRecord: Payment, now: Date) {
  // biome-ignore lint/style/noNonNullAssertion: planName is checked before calling this function
  const planName = paymentRecord.planName!;
  const plan = PRICING_PLANS.find(p => p.name === planName);
  if (!plan) return;

  const periodEnd = new Date(now);
  if (paymentRecord.billingPeriod === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const existingSub = await db.query.subscription.findFirst({
    where: (s, { eq }) => eq(s.userId, paymentRecord.userId),
  });

  if (existingSub) {
    await db
      .update(subscription)
      .set({
        planName,
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
      planName,
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

  await createNotification({
    userId: paymentRecord.userId,
    type: "payment_successful",
    title: "Payment Successful! 🎉",
    message: `Your ${planName} subscription is now active until ${periodEnd.toLocaleDateString()}.`,
    actionUrl: "/usage/billing",
    sendPush: true,
  });
}

async function processOrderPayment(paymentRecord: Payment) {
  await createNotification({
    userId: paymentRecord.userId,
    type: "payment_successful",
    title: "Order Payment Received",
    message: `Payment of ${decrypt(paymentRecord.amount)} RWF received for your order.`,
    actionUrl: "/point-of-sales/orders",
    sendPush: true,
  });
}

async function processFailedCashin(paymentRecord: Payment) {
  await db
    .update(payment)
    .set({ status: "failed" })
    .where(eq(payment.id, paymentRecord.id));

  // Notify user of failure
  await createNotification({
    userId: paymentRecord.userId,
    type: "payment_failed",
    title: "Payment Failed",
    message: `Your payment for ${paymentRecord.planName} plan failed. Please try again.`,
    actionUrl: "/usage/billing",
    sendPush: true,
  });
}

async function processSuccessfulCashout(paymentRecord: Payment) {
  const now = new Date();

  await db
    .update(payment)
    .set({
      status: "successful",
      processedAt: now,
    })
    .where(eq(payment.id, paymentRecord.id));

  await createNotification({
    userId: paymentRecord.userId,
    type: "payment_successful",
    title: "Withdrawal Successful",
    message: `Your withdrawal of ${decrypt(paymentRecord.amount)} RWF has been sent to ${paymentRecord.phoneNumber}.`,
    actionUrl: "/point-of-sales/wallet",
    sendPush: true,
  });
}

async function processFailedCashout(paymentRecord: Payment) {
  await db
    .update(payment)
    .set({ status: "failed" })
    .where(eq(payment.id, paymentRecord.id));

  await createNotification({
    userId: paymentRecord.userId,
    type: "payment_failed",
    title: "Withdrawal Failed",
    message: `Your withdrawal of ${decrypt(paymentRecord.amount)} RWF failed. The funds remain in your account.`,
    actionUrl: "/point-of-sales/wallet",
    sendPush: true,
  });
}
