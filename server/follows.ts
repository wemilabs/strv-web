"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import {
  member,
  notification,
  organization,
  product,
  productLike,
  user,
  userFollowOrganization,
  userFollowUser,
} from "@/db/schema";
import { realtime } from "@/lib/realtime";
import { parseOrgMetadata } from "@/lib/utils";

const toggleOrganizationFollowSchema = z.object({
  organizationId: z.string().min(1),
  revalidateTargetPath: z.string().min(1),
});

const toggleUserFollowSchema = z.object({
  userId: z.string().min(1),
  revalidateTargetPath: z.string().min(1),
});

export async function toggleOrganizationFollow(
  input: z.infer<typeof toggleOrganizationFollowSchema>,
) {
  const parsed = toggleOrganizationFollowSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: z.treeifyError(parsed.error),
      isFollowing: false,
      followersCount: 0,
    } as const;
  }

  try {
    const { success, session } = await verifySession();
    if (!success || !session?.user) {
      return {
        ok: false,
        error: "Unauthorized",
        isFollowing: false,
        followersCount: 0,
      } as const;
    }

    const { organizationId, revalidateTargetPath } = parsed.data;
    const userId = session.user.id;

    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
    });

    if (!org) {
      return {
        ok: false,
        error: "Organization not found",
        isFollowing: false,
        followersCount: 0,
      } as const;
    }

    const existingFollow = await db
      .select()
      .from(userFollowOrganization)
      .where(
        and(
          eq(userFollowOrganization.userId, userId),
          eq(userFollowOrganization.organizationId, organizationId),
        ),
      )
      .limit(1);

    const wasFollowing = existingFollow.length > 0;

    const currentMetadata = parseOrgMetadata(org.metadata);
    const currentFollowersCount =
      (currentMetadata.followersCount as number) ?? 0;

    if (wasFollowing) {
      await db
        .delete(userFollowOrganization)
        .where(
          and(
            eq(userFollowOrganization.userId, userId),
            eq(userFollowOrganization.organizationId, organizationId),
          ),
        );

      const newFollowersCount = Math.max(0, currentFollowersCount - 1);
      const updatedMetadata = JSON.stringify({
        ...currentMetadata,
        followersCount: newFollowersCount,
      });

      await db
        .update(organization)
        .set({ metadata: updatedMetadata })
        .where(eq(organization.id, organizationId));

      revalidatePath(revalidateTargetPath);
      return {
        ok: true,
        isFollowing: false,
        followersCount: newFollowersCount,
      } as const;
    }

    await db.insert(userFollowOrganization).values({
      userId,
      organizationId,
    });

    const newFollowersCount = currentFollowersCount + 1;
    const updatedMetadata = JSON.stringify({
      ...currentMetadata,
      followersCount: newFollowersCount,
    });

    await db
      .update(organization)
      .set({ metadata: updatedMetadata })
      .where(eq(organization.id, organizationId));

    const orgOwners = await db
      .select({ userId: member.userId })
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.role, "owner"),
        ),
      );

    for (const owner of orgOwners) {
      const [inserted] = await db
        .insert(notification)
        .values({
          userId: owner.userId,
          type: "new_follower",
          title: "New Follower",
          message: `${session.user.name} started following ${org.name}`,
        })
        .returning({ id: notification.id });

      await realtime.channel(`user:${owner.userId}`).emit("followers.new", {
        notificationId: inserted.id,
        followerId: userId,
        followerName: session.user.name ?? "Someone",
        followerImage: session.user.image ?? undefined,
        targetId: organizationId,
        targetType: "organization",
        targetName: org.name,
        createdAt: new Date().toISOString(),
      });
    }

    revalidatePath(revalidateTargetPath);
    return {
      ok: true,
      isFollowing: true,
      followersCount: newFollowersCount,
    } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error("toggleOrganizationFollow error:", e);
    return {
      ok: false,
      error: e.message,
      isFollowing: false,
      followersCount: 0,
    } as const;
  }
}

export async function toggleUserFollow(
  input: z.infer<typeof toggleUserFollowSchema>,
) {
  const parsed = toggleUserFollowSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: z.treeifyError(parsed.error),
      isFollowing: false,
      followersCount: 0,
    } as const;
  }

  try {
    const { success, session } = await verifySession();
    if (!success || !session?.user) {
      return {
        ok: false,
        error: "Unauthorized",
        isFollowing: false,
        followersCount: 0,
      } as const;
    }

    const { userId: targetUserId, revalidateTargetPath } = parsed.data;
    const currentUserId = session.user.id;

    if (targetUserId === currentUserId) {
      return {
        ok: false,
        error: "Cannot follow yourself",
        isFollowing: false,
        followersCount: 0,
      } as const;
    }

    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, targetUserId),
    });

    if (!targetUser) {
      return {
        ok: false,
        error: "User not found",
        isFollowing: false,
        followersCount: 0,
      } as const;
    }

    const existingFollow = await db
      .select()
      .from(userFollowUser)
      .where(
        and(
          eq(userFollowUser.followerId, currentUserId),
          eq(userFollowUser.followingId, targetUserId),
        ),
      )
      .limit(1);

    const wasFollowing = existingFollow.length > 0;

    if (wasFollowing) {
      await db
        .delete(userFollowUser)
        .where(
          and(
            eq(userFollowUser.followerId, currentUserId),
            eq(userFollowUser.followingId, targetUserId),
          ),
        );

      await db
        .update(user)
        .set({
          followersCount: sql`GREATEST(0, ${user.followersCount} - 1)`,
        })
        .where(eq(user.id, targetUserId));

      await db
        .update(user)
        .set({
          followingCount: sql`GREATEST(0, ${user.followingCount} - 1)`,
        })
        .where(eq(user.id, currentUserId));

      const updatedUser = await db
        .select({ followersCount: user.followersCount })
        .from(user)
        .where(eq(user.id, targetUserId))
        .limit(1);

      const followersCount = updatedUser[0]?.followersCount ?? 0;

      revalidatePath(revalidateTargetPath);
      return { ok: true, isFollowing: false, followersCount } as const;
    }

    await db.insert(userFollowUser).values({
      followerId: currentUserId,
      followingId: targetUserId,
    });

    await db
      .update(user)
      .set({
        followersCount: sql`${user.followersCount} + 1`,
      })
      .where(eq(user.id, targetUserId));

    await db
      .update(user)
      .set({
        followingCount: sql`${user.followingCount} + 1`,
      })
      .where(eq(user.id, currentUserId));

    const [inserted] = await db
      .insert(notification)
      .values({
        userId: targetUserId,
        type: "new_follower",
        title: "New Follower",
        message: `${session.user.name} started following you`,
      })
      .returning({ id: notification.id });

    await realtime.channel(`user:${targetUserId}`).emit("followers.new", {
      notificationId: inserted.id,
      followerId: currentUserId,
      followerName: session.user.name ?? "Someone",
      followerImage: session.user.image ?? undefined,
      targetId: targetUserId,
      targetType: "user",
      targetName: targetUser.name ?? "User",
      createdAt: new Date().toISOString(),
    });

    const updatedUser = await db
      .select({ followersCount: user.followersCount })
      .from(user)
      .where(eq(user.id, targetUserId))
      .limit(1);

    const followersCount = updatedUser[0]?.followersCount ?? 0;

    revalidatePath(revalidateTargetPath);
    return { ok: true, isFollowing: true, followersCount } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error("toggleUserFollow error:", e);
    return {
      ok: false,
      error: e.message,
      isFollowing: false,
      followersCount: 0,
    } as const;
  }
}

export async function getFollowingFeedProducts() {
  try {
    const { success, session } = await verifySession();
    if (!success || !session?.user) {
      return {
        ok: false,
        error: "Unauthorized",
        products: [],
      } as const;
    }

    const userId = session.user.id;

    // Get followed organizations and users
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
      return {
        ok: true,
        products: [],
        message: "Follow some merchants or users to see products here",
      } as const;
    }

    // Get products liked by followed users
    let likedProductIds: string[] = [];
    if (followedUserIds.length > 0) {
      const likedByFollowed = await db
        .select({ productId: productLike.productId })
        .from(productLike)
        .where(inArray(productLike.userId, followedUserIds));
      likedProductIds = likedByFollowed.map(l => l.productId);
    }

    const allProductIds = new Set<string>();

    // Get products from followed organizations
    const productsFromOrgs =
      followedOrgIds.length > 0
        ? await db.query.product.findMany({
            where: and(
              inArray(product.organizationId, followedOrgIds),
              eq(product.status, "in_stock"),
            ),
            with: {
              organization: {
                columns: { id: true, name: true, logo: true, slug: true },
              },
              productTags: {
                with: {
                  tag: { columns: { id: true, name: true, slug: true } },
                },
              },
            },
          })
        : [];

    for (const p of productsFromOrgs) {
      allProductIds.add(p.id);
    }

    // Get products liked by followed users (excluding those already from orgs)
    const uniqueLikedIds = likedProductIds.filter(id => !allProductIds.has(id));

    const productsLikedByFollowed =
      uniqueLikedIds.length > 0
        ? await db.query.product.findMany({
            where: and(
              inArray(product.id, uniqueLikedIds),
              eq(product.status, "in_stock"),
            ),
            with: {
              organization: {
                columns: { id: true, name: true, logo: true, slug: true },
              },
              productTags: {
                with: {
                  tag: { columns: { id: true, name: true, slug: true } },
                },
              },
            },
          })
        : [];

    // Combine all products
    const allProducts = [...productsFromOrgs, ...productsLikedByFollowed];

    // Shuffle array for random order
    for (let i = allProducts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allProducts[i], allProducts[j]] = [allProducts[j], allProducts[i]];
    }

    // Get user's liked products for isLiked flag
    const userLikedProducts = await db
      .select({ productId: productLike.productId })
      .from(productLike)
      .where(eq(productLike.userId, userId));
    const userLikedIds = new Set(userLikedProducts.map(like => like.productId));

    // Format products with metadata
    const productsWithMeta = allProducts.map(p => ({
      ...p,
      tags: p.productTags.map(pt => pt.tag),
      isLiked: userLikedIds.has(p.id),
      source: followedOrgIds.includes(p.organizationId)
        ? "followed_merchant"
        : "liked_by_followed",
    }));

    return {
      ok: true,
      products: productsWithMeta,
    } as const;
  } catch (error: unknown) {
    const e = error as Error;
    console.error("getFollowingFeedProducts error:", e);
    return {
      ok: false,
      error: e.message,
      products: [],
    } as const;
  }
}
