import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { connection, type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { product, productLike } from "@/db/schema";
import { auth } from "@/lib/auth";

const getUserLikedProductIds = async (userId: string): Promise<Set<string>> => {
  const likes = await db
    .select({ productId: productLike.productId })
    .from(productLike)
    .where(eq(productLike.userId, userId));
  return new Set(likes.map(like => like.productId));
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  await connection();

  try {
    const { slug } = await params;

    const specificProduct = await db.query.product.findFirst({
      where: eq(product.slug, slug),
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
        productTags: {
          with: {
            tag: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!specificProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const productWithTags = {
      ...specificProduct,
      tags: specificProduct.productTags.map(pt => pt.tag),
    };

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({
        ...productWithTags,
        isLiked: false,
      });
    }

    const likedProductIds = await getUserLikedProductIds(session.user.id);
    return NextResponse.json({
      ...productWithTags,
      isLiked: likedProductIds.has(specificProduct.id),
    });
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}
