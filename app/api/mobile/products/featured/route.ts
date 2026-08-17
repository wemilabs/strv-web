import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { connection, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { type ProductCategory, product, productLike } from "@/db/schema";
import { auth } from "@/lib/auth";
import { CATEGORY_CONFIG } from "@/lib/constants";

const getUserLikedProductIds = async (userId: string): Promise<Set<string>> => {
  const likes = await db
    .select({ productId: productLike.productId })
    .from(productLike)
    .where(eq(productLike.userId, userId));
  return new Set(likes.map(like => like.productId));
};

export async function GET() {
  await connection();

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const products = await db.query.product.findMany({
      where: eq(product.status, "in_stock"),
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
      orderBy: (product, { desc }) => [desc(product.createdAt)],
    });

    const productsWithTags = products.map(p => ({
      ...p,
      tags: p.productTags.map(pt => pt.tag),
    }));

    let productsWithLikes = productsWithTags;
    if (session?.user) {
      const likedProductIds = await getUserLikedProductIds(session.user.id);
      productsWithLikes = productsWithTags.map(p => ({
        ...p,
        isLiked: likedProductIds.has(p.id),
      }));
    } else {
      productsWithLikes = productsWithTags.map(p => ({
        ...p,
        isLiked: false,
      }));
    }

    const groupedByCategory = productsWithLikes.reduce(
      (acc, product) => {
        const category = product.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      },
      {} as Record<ProductCategory, typeof productsWithLikes>,
    );

    const categoriesWithProducts = Object.entries(groupedByCategory)
      .map(([category, categoryProducts]) => ({
        category: category as ProductCategory,
        products: categoryProducts.slice(0, 6),
        totalCount: categoryProducts.length,
        config: CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG],
      }))
      .filter(({ config }) => config)
      .sort((a, b) => a.config.priority - b.config.priority);

    return NextResponse.json({ categories: categoriesWithProducts });
  } catch (error) {
    console.error("Failed to fetch featured products:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured products" },
      { status: 500 },
    );
  }
}
