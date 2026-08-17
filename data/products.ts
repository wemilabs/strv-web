import { and, eq, ilike, inArray, sql } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { cache } from "react";
import "server-only";
import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import {
  type ProductCategory,
  type ProductStatus,
  product,
  productLike,
  productTag,
  tag,
} from "@/db/schema";
import { CATEGORY_CONFIG } from "@/lib/constants";

export const getUserLikedProductIds = async (
  userId: string,
): Promise<Set<string>> => {
  const likes = await db
    .select({ productId: productLike.productId })
    .from(productLike)
    .where(eq(productLike.userId, userId));
  return new Set(likes.map(like => like.productId));
};

export const getInStockProducts = cache(async () => {
  "use cache: private";
  cacheLife("seconds");

  const { success, session } = await verifySession();

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

  if (!success || !session) {
    return productsWithTags.map(p => ({ ...p, isLiked: false }));
  }

  const likedProductIds = await getUserLikedProductIds(session.user.id);
  return productsWithTags.map(p => ({
    ...p,
    isLiked: likedProductIds.has(p.id),
  }));
});

export const getProductsPerStore = cache(async (organizationId: string) => {
  const { success, session } = await verifySession();
  if (!success) return { message: "Please sign in to access this page" };

  try {
    const products = await db.query.product.findMany({
      where: and(eq(product.organizationId, organizationId)),
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
      orderBy: (product, { desc }) => [desc(product.createdAt)],
    });
    const likedProductIds = await getUserLikedProductIds(session.user.id);
    return products.map(p => ({ ...p, isLiked: likedProductIds.has(p.id) }));
  } catch (error) {
    console.error(
      "Failed to fetch products for organization:",
      organizationId,
      error,
    );
    return { message: "Failed to fetch products for organization" };
  }
});

export const getProductsPerStoreWithoutAuth = cache(
  async (organizationId: string) => {
    "use cache";
    cacheLife("minutes");

    try {
      const products = await db.query.product.findMany({
        where: and(eq(product.organizationId, organizationId)),
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
        orderBy: (product, { desc }) => [desc(product.createdAt)],
      });
      return products.map(p => ({ ...p, isLiked: false }));
    } catch (error) {
      console.error(
        "Failed to fetch products for organization:",
        organizationId,
        error,
      );
      return { message: "Failed to fetch products for organization" };
    }
  },
);

export const getProductBySlug = cache(async (slug: string) => {
  "use cache: private";
  cacheLife("weeks");

  try {
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
      },
      orderBy: (product, { desc }) => [desc(product.createdAt)],
    });

    if (!specificProduct) return undefined;

    const { success, session } = await verifySession();
    if (!success) {
      return {
        ...specificProduct,
        isLiked: false,
      };
    }

    const likedProductIds = await getUserLikedProductIds(session.user.id);
    return {
      ...specificProduct,
      isLiked: likedProductIds.has(specificProduct.id),
    };
  } catch (error) {
    console.error("Failed to fetch product by slug:", slug, error);
    return undefined;
  }
});

type ProductFilters = {
  search?: string;
  tagSlugs?: string[];
  status?: ProductStatus;
  sortBy?: "newest" | "oldest" | "price_low" | "price_high" | "popular";
};

async function getFilteredCachedProductsBase(filters: ProductFilters = {}) {
  "use cache";
  cacheLife("minutes");

  const { search, tagSlugs, status = "in_stock", sortBy = "newest" } = filters;

  try {
    let query = db
      .select({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        likesCount: product.likesCount,
        status: product.status,
        category: product.category,
        organizationId: product.organizationId,
        calories: product.calories,
        imageUrls: product.imageUrls,
        brand: product.brand,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        organization: {
          id: sql<string>`${product.organizationId}`,
          name: sql<string>`org.name`,
          logo: sql<string>`org.logo`,
          slug: sql<string>`org.slug`,
          metadata: sql<string>`org.metadata`,
        },
      })
      .from(product)
      .leftJoin(sql`organization org`, sql`org.id = ${product.organizationId}`)
      .$dynamic();

    const conditions = [eq(product.status, status)];

    if (search) {
      conditions.push(
        sql`(
          ${ilike(product.name, `%${search}%`)} OR 
          ${ilike(product.description, `%${search}%`)}
        )`,
      );
    }

    if (tagSlugs && tagSlugs.length > 0) {
      const tagIds = await db
        .select({ id: tag.id })
        .from(tag)
        .where(inArray(tag.slug, tagSlugs));

      if (tagIds.length > 0) {
        const productIds = await db
          .selectDistinct({ productId: productTag.productId })
          .from(productTag)
          .where(
            inArray(
              productTag.tagId,
              tagIds.map(t => t.id),
            ),
          );

        if (productIds.length > 0) {
          conditions.push(
            inArray(
              product.id,
              productIds.map(p => p.productId),
            ),
          );
        } else {
          return [];
        }
      }
    }

    query = query.where(and(...conditions));

    switch (sortBy) {
      case "oldest":
        query = query.orderBy(product.createdAt);
        break;
      case "price_low":
        query = query.orderBy(product.price);
        break;
      case "price_high":
        query = query.orderBy(sql`${product.price} DESC`);
        break;
      case "popular":
        query = query.orderBy(sql`${product.likesCount} DESC`);
        break;
      default:
        query = query.orderBy(sql`${product.createdAt} DESC`);
    }

    const products = await query;
    return products;
  } catch (error) {
    console.error("Failed to fetch filtered products:", error);
    return [];
  }
}

export const getProductsByCategorySlug = cache(
  async (categorySlug: ProductCategory) => {
    "use cache: private";
    cacheLife("seconds");

    const { success, session } = await verifySession();

    const products = await db.query.product.findMany({
      where: and(
        eq(product.status, "in_stock"),
        eq(product.category, categorySlug),
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

    if (!success || !session) {
      return productsWithTags.map(p => ({ ...p, isLiked: false }));
    }

    const likedProductIds = await getUserLikedProductIds(session.user.id);
    return productsWithTags.map(p => ({
      ...p,
      isLiked: likedProductIds.has(p.id),
    }));
  },
);

export const getFilteredProducts = cache(
  async (filters: ProductFilters = {}) => {
    "use cache: private";
    cacheLife("seconds");

    const { success, session } = await verifySession();

    const products = await getFilteredCachedProductsBase(filters);

    if (!success || !session) {
      return products.map(p => ({ ...p, isLiked: false }));
    }

    const likedProductIds = await getUserLikedProductIds(session.user.id);
    return products.map(p => ({ ...p, isLiked: likedProductIds.has(p.id) }));
  },
);

export const getLatestProductsByCategory = cache(async () => {
  "use cache: private";
  cacheLife("seconds");

  const { success, session } = await verifySession();

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

  // Add isLiked status if user is authenticated
  let productsWithLikes = productsWithTags;
  if (success && session) {
    const likedProductIds = await getUserLikedProductIds(session.user.id);
    productsWithLikes = productsWithTags.map(p => ({
      ...p,
      isLiked: likedProductIds.has(p.id),
    }));
  } else {
    productsWithLikes = productsWithTags.map(p => ({ ...p, isLiked: false }));
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

  return categoriesWithProducts;
});
