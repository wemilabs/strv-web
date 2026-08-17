import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DynamicHeading } from "@/components/products/dynamic-heading";
import { FilteredProducts } from "@/components/products/filtered-products";
import { ProductFilters } from "@/components/products/product-filters";
import { SkeletonProductCard } from "@/components/products/skeleton-product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductsByCategorySlug } from "@/data/products";
import { getTagsByCategory } from "@/data/tags";
import type { ProductCategory } from "@/db/schema";
import { CATEGORY_CONTENT, GENERAL_BRANDING_IMG_URL } from "@/lib/constants";
import { getCategoryLabel, PRODUCT_CATEGORIES } from "@/lib/utils";

const isValidCategorySlug = (slug: string): slug is ProductCategory =>
  PRODUCT_CATEGORIES.includes(slug as ProductCategory);

// Helper function to get filtered products for metadata
async function getFilteredProductsForMetadata(
  categorySlug: ProductCategory,
  search?: string,
  tags?: string[],
  sort?: string,
) {
  const products = await getProductsByCategorySlug(categorySlug);

  let filteredProducts = products.filter(product => {
    const matchesSearch =
      !search ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase()) ||
      product.organization?.name.toLowerCase().includes(search.toLowerCase());

    const matchesTags =
      !tags ||
      tags.length === 0 ||
      (product.tags?.some(tag => tags.includes(tag.slug)) ?? false);

    return matchesSearch && matchesTags;
  });

  // Apply sorting
  filteredProducts = filteredProducts.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "price_low":
        return Number(a.price) - Number(b.price);
      case "price_high":
        return Number(b.price) - Number(a.price);
      case "popular":
        return (b.likesCount ?? 0) - (a.likesCount ?? 0);
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });

  return filteredProducts;
}

async function ProductsList({
  categorySlug,
}: {
  categorySlug: ProductCategory;
}) {
  const products = await getProductsByCategorySlug(categorySlug);
  return <FilteredProducts data={products} />;
}

async function ProductFiltersWrapper({
  categorySlug,
}: {
  categorySlug: ProductCategory;
}) {
  const availableTags = await getTagsByCategory(categorySlug);
  return <ProductFilters availableTags={availableTags} />;
}

interface ProductsPageProps {
  params: Promise<{ categorySlug: ProductCategory }>;
  searchParams: Promise<{
    search?: string;
    tags?: string | string[];
    sort?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const { search, tags, sort } = await searchParams;

  if (!isValidCategorySlug(categorySlug))
    return {
      title: "Category Not Found - Starva.shop",
      description: "The requested product category does not exist.",
    };

  const categoryLabel = getCategoryLabel(categorySlug);
  const categoryContent = CATEGORY_CONTENT[categorySlug];

  const parsedTags = Array.isArray(tags)
    ? tags
    : tags
      ? tags.split(",").filter(Boolean)
      : [];

  const filteredProducts = await getFilteredProductsForMetadata(
    categorySlug,
    search,
    parsedTags,
    sort,
  );
  const firstProduct = filteredProducts[0];

  // Build dynamic title based on category and filters
  let title = categoryContent?.title || categoryLabel;
  let description =
    categoryContent?.description ||
    `Browse ${categoryLabel.toLowerCase()} from local partners`;

  if (search) {
    title = `Search results for "${search}" in ${categoryLabel}`;
    description = `Find ${categoryLabel.toLowerCase()} matching "${search}" from local partners`;
  }

  if (parsedTags && parsedTags.length > 0) {
    const tagLabels = parsedTags.join(", ");
    if (search) {
      title += ` in ${tagLabels}`;
      description += ` in ${tagLabels} categories`;
    } else {
      title = `${tagLabels} ${categoryLabel}`;
      description = `Browse ${tagLabels} ${categoryLabel.toLowerCase()} from local partners`;
    }
  }

  if (sort && sort !== "newest") {
    const sortLabels = {
      oldest: "Oldest First",
      price_low: "Lowest Price",
      price_high: "Highest Price",
      popular: "Most Popular",
    };
    title += ` (${sortLabels[sort as keyof typeof sortLabels]})`;
  }

  // Update description with product count and first product info
  if (filteredProducts.length > 0) {
    description = `${
      filteredProducts.length
    } ${categoryLabel.toLowerCase()} product${
      filteredProducts.length > 1 ? "s" : ""
    } found`;
    if (firstProduct) {
      description += `. Featuring: ${firstProduct.name} from ${
        firstProduct.organization?.name || "local partner"
      }`;
    }
  } else {
    description = `No ${categoryLabel.toLowerCase()} products found matching your criteria`;
  }

  // Build Open Graph images array
  const images = [];
  if (firstProduct?.imageUrls?.[0]) {
    images.push({
      url: firstProduct.imageUrls[0],
      width: 1200,
      height: 630,
      alt: `${firstProduct.name} from ${
        firstProduct.organization?.name || "local partner"
      }`,
    });
  } else {
    images.push({
      url: GENERAL_BRANDING_IMG_URL,
      width: 1200,
      height: 630,
      alt: "Starva.shop - A sure platform for local stores and customers to meet. Easy, fast and reliable.",
    });
  }

  // Build keywords for SEO
  const keywords = [
    ...(categoryContent?.keywords || []),
    "Starva.shop",
    "local stores",
    "online shopping",
    categoryLabel.toLowerCase(),
  ];

  return {
    title: `${title} - Starva.shop`,
    description,
    keywords,
    openGraph: {
      title: `${title} - Starva.shop`,
      description,
      url: `https://Starva.shop.shop/products/category/${categorySlug}${
        search ? `?search=${encodeURIComponent(search)}` : ""
      }${
        parsedTags && parsedTags.length > 0
          ? `${search ? "&" : "?"}tags=${parsedTags.join(",")}`
          : ""
      }${
        sort && sort !== "newest"
          ? `${search || parsedTags?.length ? "&" : "?"}sort=${sort}`
          : ""
      }`,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - Starva.shop`,
      description,
      images: images.map(img => img.url),
    },
  };
}

// Component that handles the dynamic content with searchParams
async function ProductsPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: ProductCategory }>;
  searchParams: Promise<{
    search?: string;
    tags?: string | string[];
    sort?: string;
  }>;
}) {
  const { categorySlug } = await params;
  const { search, tags } = await searchParams;

  if (!isValidCategorySlug(categorySlug)) notFound();

  const parsedTags = Array.isArray(tags)
    ? tags
    : tags
      ? tags.split(",").filter(Boolean)
      : [];

  return (
    <>
      <DynamicHeading
        initialSearch={search}
        initialTags={parsedTags}
        categorySlug={categorySlug}
      />

      <div className="mb-8">
        <Suspense
          fallback={
            <div className="h-32 rounded-lg border bg-background animate-pulse" />
          }
        >
          <ProductFiltersWrapper categorySlug={categorySlug} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 justify-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense
          fallback={
            <>
              <div className="col-span-full text-sm text-pretty text-muted-foreground font-mono tracking-tighter">
                Loading products...
              </div>
              <SkeletonProductCard />
              <SkeletonProductCard />
              <SkeletonProductCard />
              <SkeletonProductCard />
              <SkeletonProductCard />
              <SkeletonProductCard />
            </>
          }
        >
          <ProductsList categorySlug={categorySlug} />
        </Suspense>
      </div>
    </>
  );
}

export default async function ProductCategorySlugPage({
  params,
  searchParams,
}: ProductsPageProps) {
  return (
    <div className="container mx-auto max-w-7xl py-7 space-y-7">
      <Suspense
        fallback={
          <>
            <div className="mb-8">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-80" />
            </div>
            <div className="mb-8">
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="grid grid-cols-1 justify-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-full text-sm text-pretty text-muted-foreground font-mono tracking-tighter">
                Loading products...
              </div>
              <SkeletonProductCard />
              <SkeletonProductCard />
              <SkeletonProductCard />
              <SkeletonProductCard />
              <SkeletonProductCard />
              <SkeletonProductCard />
            </div>
          </>
        }
      >
        <ProductsPageContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
