import { and, count, eq } from "drizzle-orm";
import { connection, type NextRequest, NextResponse } from "next/server";

import { db } from "@/db/drizzle";
import { organization, product, userFollowOrganization } from "@/db/schema";
import { getMobileSession } from "@/lib/mobile-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  await connection();

  try {
    const session = await getMobileSession();

    const { slug } = await params;

    const org = await db.query.organization.findFirst({
      where: eq(organization.slug, slug),
      with: {
        products: {
          where: eq(product.status, "in_stock"),
          limit: 10,
          orderBy: (product, { desc }) => [desc(product.createdAt)],
          with: {
            productTags: {
              with: {
                tag: {
                  columns: { id: true, name: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 },
      );
    }

    const [followerCountResult] = await db
      .select({ count: count() })
      .from(userFollowOrganization)
      .where(eq(userFollowOrganization.organizationId, org.id));

    const [productCountResult] = await db
      .select({ count: count() })
      .from(product)
      .where(
        and(eq(product.organizationId, org.id), eq(product.status, "in_stock")),
      );

    let isFollowing = false;
    if (session?.user) {
      const follow = await db.query.userFollowOrganization.findFirst({
        where: and(
          eq(userFollowOrganization.userId, session.user.id),
          eq(userFollowOrganization.organizationId, org.id),
        ),
      });
      isFollowing = !!follow;
    }

    const productsWithTags = org.products.map(p => ({
      ...p,
      tags: p.productTags.map(pt => pt.tag),
    }));

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      metadata: org.metadata,
      createdAt: org.createdAt,
      followerCount: followerCountResult?.count ?? 0,
      productCount: productCountResult?.count ?? 0,
      isFollowing,
      products: productsWithTags,
    });
  } catch (error) {
    console.error("Failed to fetch merchant:", error);
    return NextResponse.json(
      { error: "Failed to fetch merchant" },
      { status: 500 },
    );
  }
}
