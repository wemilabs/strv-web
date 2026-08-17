import "server-only";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { cacheLife } from "next/cache";
import { cache } from "react";

import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import {
  member,
  organization,
  productLike,
  product as productTable,
  user,
  userFollowOrganization,
  userFollowUser,
} from "@/db/schema";
import { getUserFollowedOrganizations, isFollowingUser } from "./follows";

export interface UserOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
}

export async function getAllUsers(options: UserOptions = {}) {
  const { page = 1, limit = 20, search, status } = options;
  const offset = (page - 1) * limit;

  try {
    let whereCondition: SQL | undefined;

    if (search) {
      // Search by user name OR organization name
      whereCondition = ilike(user.name, `%${search}%`);

      const orgUsers = await db
        .select({ userId: member.userId })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(ilike(organization.name, `%${search}%`));

      const userIds = orgUsers.map(u => u.userId);

      if (userIds.length > 0)
        whereCondition = or(whereCondition, inArray(user.id, userIds));
    }

    if (status === "active")
      whereCondition = whereCondition
        ? and(whereCondition, eq(user.emailVerified, true))
        : eq(user.emailVerified, true);
    else if (status === "inactive")
      whereCondition = whereCondition
        ? and(whereCondition, eq(user.emailVerified, false))
        : eq(user.emailVerified, false);

    const users = await db.query.user.findMany({
      where: whereCondition,
      orderBy: desc(user.createdAt),
      limit,
      offset,
    });

    // Get organizations for each user separately
    const usersWithOrgs = await Promise.all(
      users.map(async userRecord => {
        const userMembers = await db.query.member.findMany({
          where: eq(member.userId, userRecord.id),
          with: {
            organization: true,
          },
        });

        return {
          ...userRecord,
          members: userMembers,
        };
      }),
    );

    const totalCountResult = await db
      .select({ count: count() })
      .from(user)
      .where(whereCondition);

    const totalCount = totalCountResult[0]?.count || 0;

    return {
      users: usersWithOrgs,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      users: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0,
      },
    };
  }
}

export async function getUserById(id: string) {
  try {
    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, id),
    });

    if (!userRecord) return null;

    // Get organizations for this user
    const userMembers = await db.query.member.findMany({
      where: eq(member.userId, id),
      with: {
        organization: true,
      },
    });

    return {
      ...userRecord,
      members: userMembers,
    };
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }
}

export async function getUserStats() {
  try {
    const totalUsers = await db.select({ count: count() }).from(user);
    const activeUsers = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.emailVerified, true));
    const inactiveUsers = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.emailVerified, false));

    // Get users created in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const newUsersToday = await db
      .select({ count: count() })
      .from(user)
      .where(gte(user.createdAt, oneDayAgo));

    return {
      total: totalUsers[0]?.count || 0,
      active: activeUsers[0]?.count || 0,
      inactive: inactiveUsers[0]?.count || 0,
      newToday: newUsersToday[0]?.count || 0,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return {
      total: 0,
      active: 0,
      inactive: 0,
      newToday: 0,
    };
  }
}

export async function getMyLikedProductsForMobile(userId: string) {
  const likedByUser = await db
    .select({ productId: productLike.productId })
    .from(productLike)
    .where(eq(productLike.userId, userId))
    .orderBy(desc(productLike.createdAt));

  const likedProductIds = likedByUser.map(l => l.productId);
  if (likedProductIds.length === 0) return [];

  const products = await db.query.product.findMany({
    where: and(
      inArray(productTable.id, likedProductIds),
      eq(productTable.status, "in_stock"),
    ),
    with: {
      organization: {
        columns: {
          id: true,
          name: true,
          logo: true,
          slug: true,
          metadata: true,
        },
      },
    },
  });

  const productById = new Map(products.map(p => [p.id, p] as const));

  return likedProductIds
    .map(id => productById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map(p => ({
      ...p,
      isLiked: true,
    }));
}

export const getUserByIdWithFollowStatus = cache(
  async (targetUserId: string) => {
    const { success, session } = await verifySession();

    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, targetUserId),
    });

    if (!userRecord) return null;

    const userMembers = await db.query.member.findMany({
      where: eq(member.userId, targetUserId),
      with: {
        organization: true,
      },
    });

    const likesCount = await db
      .select({ count: count() })
      .from(productLike)
      .where(eq(productLike.userId, targetUserId));

    const followedOrgsCount = await db
      .select({ count: count() })
      .from(userFollowOrganization)
      .where(eq(userFollowOrganization.userId, targetUserId));

    let isFollowing = false;
    let isSelf = false;
    const isAuthenticated = success && !!session?.user;

    if (isAuthenticated) {
      isSelf = session.user.id === targetUserId;
      if (!isSelf) {
        isFollowing = await isFollowingUser(session.user.id, targetUserId);
      }
    }

    return {
      ...userRecord,
      members: userMembers,
      likesCount: likesCount[0]?.count ?? 0,
      followedOrgsCount: followedOrgsCount[0]?.count ?? 0,
      isFollowing,
      isSelf,
      isAuthenticated,
    };
  },
);

export const getDiscoverableUsers = cache(async () => {
  const { success, session } = await verifySession();

  let excludeUserIds: string[] = [];

  if (success && session?.user) {
    const followedUsers = await db
      .select({ followingId: userFollowUser.followingId })
      .from(userFollowUser)
      .where(eq(userFollowUser.followerId, session.user.id));

    excludeUserIds = [
      session.user.id,
      ...followedUsers.map(f => f.followingId),
    ];
  }

  const whereCondition =
    excludeUserIds.length > 0
      ? and(ne(user.banned, true), ...excludeUserIds.map(id => ne(user.id, id)))
      : ne(user.banned, true);

  const users = await db.query.user.findMany({
    where: whereCondition,
    orderBy: desc(user.followersCount),
  });

  const usersWithStats = await Promise.all(
    users.map(async userRecord => {
      const likesCount = await db
        .select({ count: count() })
        .from(productLike)
        .where(eq(productLike.userId, userRecord.id));

      return {
        ...userRecord,
        likesCount: likesCount[0]?.count ?? 0,
      };
    }),
  );

  return usersWithStats;
});

export const getUserProfileData = cache(async (targetUserId: string) => {
  "use cache: private";
  cacheLife("minutes");

  const { success, session } = await verifySession();
  const viewerUserId = success && session?.user ? session.user.id : null;

  const likedByProfile = await db
    .select({ productId: productLike.productId })
    .from(productLike)
    .where(eq(productLike.userId, targetUserId))
    .orderBy(desc(productLike.createdAt))
    .limit(12);

  const likedProductIds = likedByProfile.map(l => l.productId);

  const likedProducts =
    likedProductIds.length > 0
      ? await db.query.product.findMany({
          where: and(
            inArray(productTable.id, likedProductIds),
            eq(productTable.status, "in_stock"),
          ),
          with: {
            organization: {
              columns: {
                id: true,
                name: true,
                logo: true,
                slug: true,
                metadata: true,
              },
            },
          },
        })
      : [];

  const viewerLikedIds = viewerUserId
    ? await db
        .select({ productId: productLike.productId })
        .from(productLike)
        .where(
          and(
            inArray(
              productLike.productId,
              likedProductIds.length > 0 ? likedProductIds : ["__none__"],
            ),
            eq(productLike.userId, viewerUserId),
          ),
        )
    : [];

  const viewerLikedSet = new Set(viewerLikedIds.map(l => l.productId));

  const followerIds = await db
    .select({ followerId: userFollowUser.followerId })
    .from(userFollowUser)
    .where(eq(userFollowUser.followingId, targetUserId))
    .limit(24);

  const followingIds = await db
    .select({ followingId: userFollowUser.followingId })
    .from(userFollowUser)
    .where(eq(userFollowUser.followerId, targetUserId))
    .limit(24);

  const followers =
    followerIds.length > 0
      ? await db.query.user.findMany({
          where: inArray(
            user.id,
            followerIds.map(f => f.followerId),
          ),
          columns: {
            id: true,
            name: true,
            image: true,
            followersCount: true,
          },
          limit: 24,
        })
      : [];

  const following =
    followingIds.length > 0
      ? await db.query.user.findMany({
          where: inArray(
            user.id,
            followingIds.map(f => f.followingId),
          ),
          columns: {
            id: true,
            name: true,
            image: true,
            followersCount: true,
          },
          limit: 24,
        })
      : [];

  // Get follow status for followers list
  const followersWithStatus = await Promise.all(
    followers.map(async follower => ({
      ...follower,
      isFollowing: viewerUserId
        ? await isFollowingUser(viewerUserId, follower.id)
        : false,
    })),
  );

  // Get follow status for following list
  const followingWithStatus = await Promise.all(
    following.map(async followedUser => ({
      ...followedUser,
      isFollowing: viewerUserId
        ? await isFollowingUser(viewerUserId, followedUser.id)
        : false,
    })),
  );

  // Get followed organizations
  const followedOrgs = await getUserFollowedOrganizations(targetUserId);

  return {
    likedProducts,
    viewerLikedSet,
    followers: followersWithStatus,
    following: followingWithStatus,
    followedOrgs,
    viewerUserId,
  };
});
