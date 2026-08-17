import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { cache } from "react";

import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import { userFollowOrganization, userFollowUser } from "@/db/schema";

export const getUserFollowedOrganizationIds = cache(
  async (userId: string): Promise<string[]> => {
    const follows = await db
      .select({ organizationId: userFollowOrganization.organizationId })
      .from(userFollowOrganization)
      .where(eq(userFollowOrganization.userId, userId));

    return follows.map(f => f.organizationId);
  },
);

export const getUserFollowedUserIds = cache(
  async (userId: string): Promise<string[]> => {
    const follows = await db
      .select({ followingId: userFollowUser.followingId })
      .from(userFollowUser)
      .where(eq(userFollowUser.followerId, userId));

    return follows.map(f => f.followingId);
  },
);

export const getUserFollowerIds = cache(
  async (userId: string): Promise<string[]> => {
    const follows = await db
      .select({ followerId: userFollowUser.followerId })
      .from(userFollowUser)
      .where(eq(userFollowUser.followingId, userId));

    return follows.map(f => f.followerId);
  },
);

export const isFollowingOrganization = cache(
  async (userId: string, organizationId: string): Promise<boolean> => {
    const follow = await db
      .select()
      .from(userFollowOrganization)
      .where(
        and(
          eq(userFollowOrganization.userId, userId),
          eq(userFollowOrganization.organizationId, organizationId),
        ),
      )
      .limit(1);

    return follow.length > 0;
  },
);

export const isFollowingUser = cache(
  async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    const follow = await db
      .select()
      .from(userFollowUser)
      .where(
        and(
          eq(userFollowUser.followerId, currentUserId),
          eq(userFollowUser.followingId, targetUserId),
        ),
      )
      .limit(1);

    return follow.length > 0;
  },
);

export async function getFollowStatusForCurrentUser(organizationId: string) {
  const { success, session } = await verifySession();
  if (!success || !session?.user) {
    return { isFollowing: false, isAuthenticated: false };
  }

  const isFollowing = await isFollowingOrganization(
    session.user.id,
    organizationId,
  );
  return { isFollowing, isAuthenticated: true };
}

export const getUserFollowedOrganizations = cache(async (userId: string) => {
  const followedOrgs = await db.query.userFollowOrganization.findMany({
    where: eq(userFollowOrganization.userId, userId),
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
    orderBy: desc(userFollowOrganization.createdAt),
  });

  return followedOrgs.map(follow => follow.organization);
});

export async function getUserFollowStatusForCurrentUser(targetUserId: string) {
  const { success, session } = await verifySession();
  if (!success || !session?.user) {
    return { isFollowing: false, isAuthenticated: false, isSelf: false };
  }

  const isSelf = session.user.id === targetUserId;
  if (isSelf) {
    return { isFollowing: false, isAuthenticated: true, isSelf: true };
  }

  const isFollowing = await isFollowingUser(session.user.id, targetUserId);
  return { isFollowing, isAuthenticated: true, isSelf: false };
}
