"use server";

import { and, count, gte, lte } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { session } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/admin-auth";

export type UserMetricsData = {
  visitors: {
    current: number;
    previous: number;
    change: number;
  };
  pageViews: {
    current: number;
    previous: number;
    change: number;
  };
  bounceRate: {
    current: number;
    previous: number;
    change: number;
  };
  hourlyActivity: Array<{
    hour: string;
    visitors: number;
  }>;
};

export async function getUserMetrics(): Promise<UserMetricsData> {
  await requireAdmin();

  const now = new Date();
  const currentPeriodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const previousPeriodEnd = currentPeriodStart;

  const currentVisitors = await db
    .select({ count: count() })
    .from(session)
    .where(
      and(
        gte(session.createdAt, currentPeriodStart),
        lte(session.createdAt, now),
      ),
    )
    .then(result => result[0]?.count || 0);

  const previousVisitors = await db
    .select({ count: count() })
    .from(session)
    .where(
      and(
        gte(session.createdAt, previousPeriodStart),
        lte(session.createdAt, previousPeriodEnd),
      ),
    )
    .then(result => result[0]?.count || 0);

  const visitorsChange =
    previousVisitors > 0
      ? Math.round(
          ((currentVisitors - previousVisitors) / previousVisitors) * 100,
        )
      : 0;

  const currentPageViews = await db
    .select({ count: count() })
    .from(session)
    .where(
      and(
        gte(session.createdAt, currentPeriodStart),
        lte(session.createdAt, now),
      ),
    )
    .then(result => result[0]?.count || 0);

  const previousPageViews = await db
    .select({ count: count() })
    .from(session)
    .where(
      and(
        gte(session.createdAt, previousPeriodStart),
        lte(session.createdAt, previousPeriodEnd),
      ),
    )
    .then(result => result[0]?.count || 0);

  const pageViewsChange =
    previousPageViews > 0
      ? Math.round(
          ((currentPageViews - previousPageViews) / previousPageViews) * 100,
        )
      : 0;

  const BOUNCE_THRESHOLD_MS = 10 * 1000;

  const currentSessions = await db
    .select({
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .where(
      and(
        gte(session.createdAt, currentPeriodStart),
        lte(session.createdAt, now),
      ),
    );

  const currentBounces = currentSessions.filter(s => {
    const duration =
      new Date(s.expiresAt).getTime() - new Date(s.createdAt).getTime();
    return duration < BOUNCE_THRESHOLD_MS;
  }).length;

  const currentBounceRate =
    currentSessions.length > 0
      ? Math.round((currentBounces / currentSessions.length) * 100)
      : 0;

  const previousSessions = await db
    .select({
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .where(
      and(
        gte(session.createdAt, previousPeriodStart),
        lte(session.createdAt, previousPeriodEnd),
      ),
    );

  const previousBounces = previousSessions.filter(s => {
    const duration =
      new Date(s.expiresAt).getTime() - new Date(s.createdAt).getTime();
    return duration < BOUNCE_THRESHOLD_MS;
  }).length;

  const previousBounceRate =
    previousSessions.length > 0
      ? Math.round((previousBounces / previousSessions.length) * 100)
      : 0;

  const bounceRateChange =
    previousBounceRate > 0
      ? Math.round(
          ((currentBounceRate - previousBounceRate) / previousBounceRate) * 100,
        )
      : 0;

  const hourlyActivity = [];
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  for (let i = 0; i < 24; i++) {
    const hourStart = new Date(startOfDay.getTime() + i * 60 * 60 * 1000);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    const visitorsInHour = await db
      .select({ count: count() })
      .from(session)
      .where(
        and(gte(session.createdAt, hourStart), lte(session.createdAt, hourEnd)),
      )
      .then(result => result[0]?.count || 0);

    hourlyActivity.push({
      hour: hourStart
        .toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true,
        })
        .replace(" ", ""),
      visitors: visitorsInHour,
    });
  }

  return {
    visitors: {
      current: currentVisitors,
      previous: previousVisitors,
      change: visitorsChange,
    },
    pageViews: {
      current: currentPageViews,
      previous: previousPageViews,
      change: pageViewsChange,
    },
    bounceRate: {
      current: currentBounceRate,
      previous: previousBounceRate,
      change: bounceRateChange,
    },
    hourlyActivity,
  };
}
