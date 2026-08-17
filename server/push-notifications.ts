"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import webpush from "web-push";
import { db } from "@/db/drizzle";
import { mobilePushToken, notification, pushSubscription } from "@/db/schema";
import { auth } from "@/lib/auth";

type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  actions?: { action: string; title: string }[];
  requireInteraction?: boolean;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: "default" | null;
  data?: Record<string, unknown>;
};

// Configure web-push with VAPID keys
if (
  process.env.VAPID_SUBJECT &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export async function subscribeToPush(data: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    // Upsert subscription (replace if endpoint exists)
    await db
      .insert(pushSubscription)
      .values({
        userId: session.user.id,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: (await headers()).get("user-agent") || undefined,
      })
      .onConflictDoUpdate({
        target: pushSubscription.endpoint,
        set: {
          userId: session.user.id,
          p256dh: data.keys.p256dh,
          auth: data.keys.auth,
        },
      });

    return { success: true };
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return { success: false, error: "Failed to save subscription" };
  }
}

export async function unsubscribeFromPush(endpoint: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false };

  await db
    .delete(pushSubscription)
    .where(eq(pushSubscription.endpoint, endpoint));

  return { success: true };
}

async function sendExpoPushMessages(messages: ExpoPushMessage[]) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push request failed: ${response.status}`);
  }

  return response.json() as Promise<{
    data?: { status: string; message?: string; details?: unknown }[];
  }>;
}

export async function sendExpoPushToUser(
  userId: string,
  payload: PushNotificationPayload,
) {
  const tokens = await db
    .select()
    .from(mobilePushToken)
    .where(eq(mobilePushToken.userId, userId));

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messages: ExpoPushMessage[] = tokens.map(t => ({
    to: t.expoPushToken,
    title: payload.title,
    body: payload.body,
    sound: "default",
    data: payload.url ? { url: payload.url } : undefined,
  }));

  let sent = 0;
  let failed = 0;

  try {
    const result = await sendExpoPushMessages(messages);
    const receipts = result.data ?? [];

    for (let i = 0; i < receipts.length; i++) {
      const receipt = receipts[i];
      const token = tokens[i]?.expoPushToken;

      if (receipt?.status !== "ok") {
        failed++;

        const message = receipt?.message ?? "";
        const details = receipt?.details as { error?: string } | undefined;

        const isDeviceNotRegistered =
          details?.error === "DeviceNotRegistered" ||
          message.includes("DeviceNotRegistered");

        if (isDeviceNotRegistered && token) {
          await db
            .delete(mobilePushToken)
            .where(eq(mobilePushToken.expoPushToken, token));
        }

        continue;
      }

      sent++;
    }
  } catch (error) {
    console.error("Expo push failed:", error);
    failed += tokens.length;
  }

  return { sent, failed };
}

// Send push notification to a specific user
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload,
) {
  const subscriptions = await db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId));

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload),
      );
      sent++;
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      // If subscription is expired/invalid, remove it
      if (statusCode === 404 || statusCode === 410) {
        await db
          .delete(pushSubscription)
          .where(eq(pushSubscription.endpoint, sub.endpoint));
      }
      failed++;
      console.error("Push notification failed:", error);
    }
  }

  return { sent, failed };
}

// Send push to multiple users
export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload,
) {
  const results = await Promise.allSettled(
    userIds.map(userId => sendPushToUser(userId, payload)),
  );

  const totals = results.reduce(
    (acc, result) => {
      if (result.status === "fulfilled") {
        acc.sent += result.value.sent;
        acc.failed += result.value.failed;
      } else {
        acc.failed++;
      }
      return acc;
    },
    { sent: 0, failed: 0 },
  );

  return totals;
}

// Create in-app notification
export async function createNotification(data: {
  userId: string;
  type: (typeof notification.$inferInsert)["type"];
  title: string;
  message: string;
  actionUrl?: string;
  sendPush?: boolean;
}) {
  const [newNotification] = await db
    .insert(notification)
    .values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      sentViaPush: data.sendPush || false,
    })
    .returning();

  // Also send push notification if requested
  if (data.sendPush) {
    await Promise.allSettled([
      sendPushToUser(data.userId, {
        title: data.title,
        body: data.message,
        url: data.actionUrl,
      }),
      sendExpoPushToUser(data.userId, {
        title: data.title,
        body: data.message,
        url: data.actionUrl,
      }),
    ]);
  }

  return newNotification;
}

// Get user's notifications
export async function getUserNotifications(userId: string, limit = 20) {
  const notifications = await db.query.notification.findMany({
    where: (n, { eq }) => eq(n.userId, userId),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit,
  });

  return notifications;
}

// Mark notification as read
export async function markNotificationRead(notificationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false };

  await db
    .update(notification)
    .set({ read: true })
    .where(eq(notification.id, notificationId));

  return { success: true };
}

// Mark all notifications as read
export async function markAllNotificationsRead() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false };

  await db
    .update(notification)
    .set({ read: true })
    .where(eq(notification.userId, session.user.id));

  return { success: true };
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string) {
  const notifications = await db.query.notification.findMany({
    where: (n, { eq, and }) => and(eq(n.userId, userId), eq(n.read, false)),
  });

  return notifications.length;
}
