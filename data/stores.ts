import { count, eq, inArray } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { cache } from "react";
import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import {
  member,
  organization,
  product,
  userFollowOrganization,
} from "@/db/schema";
import { getCurrentUser } from "@/server/users";
import "server-only";
import { parseOrgMetadata } from "@/lib/utils";

export const getAllStoresWithFollowData = cache(async () => {
  "use cache: private";
  cacheLife("minutes");

  const { success, session } = await verifySession();
  const userId = session?.user?.id;

  const stores = await db.query.organization.findMany({
    orderBy: (organization, { desc }) => [desc(organization.createdAt)],
  });

  if (!stores || stores.length === 0) return null;

  const storeIds = stores.map(s => s.id);

  const productCounts = await db
    .select({
      organizationId: product.organizationId,
      count: count(),
    })
    .from(product)
    .where(inArray(product.organizationId, storeIds))
    .groupBy(product.organizationId);

  const productCountMap = new Map(
    productCounts.map(p => [p.organizationId, p.count]),
  );

  let followedOrgIds = new Set<string>();
  if (success && userId) {
    const followedOrgs = await db
      .select({ organizationId: userFollowOrganization.organizationId })
      .from(userFollowOrganization)
      .where(eq(userFollowOrganization.userId, userId));

    followedOrgIds = new Set(followedOrgs.map(f => f.organizationId));
  }

  return stores.map(store => {
    const metadata = parseOrgMetadata(store.metadata);
    return {
      ...store,
      followersCount: (metadata.followersCount as number) ?? 0,
      productsCount: productCountMap.get(store.id) ?? 0,
      isFollowing: followedOrgIds.has(store.id),
    };
  });
});

export async function getStoresPerUser() {
  const { currentUser } = await getCurrentUser();

  const members = await db.query.member.findMany({
    where: eq(member.userId, currentUser.id),
  });

  const stores = await db.query.organization.findMany({
    where: inArray(
      organization.id,
      members.map(member => member.organizationId),
    ),
    orderBy: (organization, { desc }) => [desc(organization.createdAt)],
  });

  const storeIds = stores.map(s => s.id);

  const productCounts = await db
    .select({
      organizationId: product.organizationId,
      count: count(),
    })
    .from(product)
    .where(inArray(product.organizationId, storeIds))
    .groupBy(product.organizationId);

  const productCountMap = new Map(
    productCounts.map(p => [p.organizationId, p.count]),
  );

  return stores.map(store => ({
    ...store,
    productsCount: productCountMap.get(store.id) ?? 0,
  }));
}

export async function getActiveStore(userId: string) {
  const memberUser = await db.query.member.findFirst({
    where: eq(member.userId, userId),
  });

  if (!memberUser) {
    return null;
  }

  const activeStore = await db.query.organization.findFirst({
    where: eq(organization.id, memberUser.organizationId),
  });

  return activeStore;
}

export async function getStoreBySlug(slug: string) {
  "use cache";
  cacheLife("minutes");

  try {
    const storeBySlug = await db.query.organization.findFirst({
      where: eq(organization.slug, slug),
      with: {
        members: {
          with: {
            user: true,
          },
        },
      },
    });

    return storeBySlug;
  } catch (error) {
    console.error(error);
    return null;
  }
}
