import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { cache } from "react";

import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import {
  organization,
  product,
  productLike,
  userFollowOrganization,
  userFollowUser,
} from "@/db/schema";
import { parseOrgMetadata } from "@/lib/utils";

export const getFollowingFeed = cache(async (limit = 20) => {
  const { success, session } = await verifySession();

  if (!success || !session?.user) {
    return [];
  }

  const userId = session.user.id;

  const followedOrgs = await db
    .select({ organizationId: userFollowOrganization.organizationId })
    .from(userFollowOrganization)
    .where(eq(userFollowOrganization.userId, userId));

  const followedUsers = await db
    .select({ followingId: userFollowUser.followingId })
    .from(userFollowUser)
    .where(eq(userFollowUser.followerId, userId));

  const followedOrgIds = followedOrgs.map(f => f.organizationId);
  const followedUserIds = followedUsers.map(f => f.followingId);

  if (followedOrgIds.length === 0 && followedUserIds.length === 0) {
    return [];
  }

  let productsFromOrgs: (typeof product.$inferSelect)[] = [];
  if (followedOrgIds.length > 0) {
    productsFromOrgs = await db.query.product.findMany({
      where: and(
        inArray(product.organizationId, followedOrgIds),
        eq(product.status, "in_stock"),
      ),
      orderBy: desc(product.createdAt),
      limit: Math.ceil(limit / 2),
      with: {
        organization: true,
      },
    });
  }

  let likedByFollowedUsers: (typeof product.$inferSelect)[] = [];
  if (followedUserIds.length > 0) {
    const likedProductIds = await db
      .select({ productId: productLike.productId })
      .from(productLike)
      .where(inArray(productLike.userId, followedUserIds))
      .orderBy(desc(productLike.createdAt))
      .limit(Math.ceil(limit / 2));

    const productIds = likedProductIds.map(l => l.productId);

    if (productIds.length > 0) {
      likedByFollowedUsers = await db.query.product.findMany({
        where: and(
          inArray(product.id, productIds),
          eq(product.status, "in_stock"),
        ),
        with: {
          organization: true,
        },
      });
    }
  }

  const allProducts = [...productsFromOrgs, ...likedByFollowedUsers];
  const uniqueProducts = allProducts.filter(
    (p, index, self) => index === self.findIndex(t => t.id === p.id),
  );

  const userLikedProductIds = await db
    .select({ productId: productLike.productId })
    .from(productLike)
    .where(eq(productLike.userId, userId));

  const likedIds = new Set(userLikedProductIds.map(l => l.productId));

  return uniqueProducts
    .map(p => ({
      ...p,
      isLiked: likedIds.has(p.id),
    }))
    .slice(0, limit);
});

export const getTrendingProducts = cache(async (limit = 20, daysBack = 7) => {
  const { success, session } = await verifySession();
  const userId = session?.user?.id;

  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysBack);

  const products = await db.query.product.findMany({
    where: and(
      eq(product.status, "in_stock"),
      gte(product.updatedAt, dateThreshold),
    ),
    orderBy: desc(product.likesCount),
    limit,
    with: {
      organization: true,
    },
  });

  if (!success || !userId) {
    return products.map(p => ({ ...p, isLiked: false }));
  }

  const userLikedProductIds = await db
    .select({ productId: productLike.productId })
    .from(productLike)
    .where(eq(productLike.userId, userId));

  const likedIds = new Set(userLikedProductIds.map(l => l.productId));

  return products.map(p => ({
    ...p,
    isLiked: likedIds.has(p.id),
  }));
});

export const getTrendingMerchants = cache(async (limit = 20) => {
  const { success, session } = await verifySession();
  const userId = session?.user?.id;

  const orgs = await db.query.organization.findMany({
    limit,
  });

  const orgsWithMetadata = orgs.map(org => {
    const metadata = parseOrgMetadata(org.metadata);
    return {
      ...org,
      followersCount: (metadata.followersCount as number) ?? 0,
      description: metadata.description as string | undefined,
    };
  });

  orgsWithMetadata.sort((a, b) => b.followersCount - a.followersCount);

  if (!success || !userId) {
    return orgsWithMetadata.map(org => ({ ...org, isFollowing: false }));
  }

  const followedOrgs = await db
    .select({ organizationId: userFollowOrganization.organizationId })
    .from(userFollowOrganization)
    .where(eq(userFollowOrganization.userId, userId));

  const followedOrgIds = new Set(followedOrgs.map(f => f.organizationId));

  return orgsWithMetadata.map(org => ({
    ...org,
    isFollowing: followedOrgIds.has(org.id),
  }));
});

export const getOrganizationFollowersCount = cache(
  async (organizationId: string): Promise<number> => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { metadata: true },
    });

    if (!org) return 0;

    const metadata = parseOrgMetadata(org.metadata);
    return (metadata.followersCount as number) ?? 0;
  },
);
