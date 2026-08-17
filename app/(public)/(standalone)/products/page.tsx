import type { Metadata } from "next";
import { Suspense } from "react";
import { DynamicHeading } from "@/components/products/dynamic-heading";
import { FilteredProducts } from "@/components/products/filtered-products";
import { ProductFilters } from "@/components/products/product-filters";
import { SkeletonProductCard } from "@/components/products/skeleton-product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getInStockProducts } from "@/data/products";
import { getAllTagsWithProducts } from "@/data/tags";
import { GENERAL_BRANDING_IMG_URL } from "@/lib/constants";

export const instant = true;

// Helper function to get filtered products for metadata
async function getFilteredProductsForMetadata(
  search?: string,
  tags?: string[],
  sort?: string,
) {
  const products = await getInStockProducts();

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

async function ProductsList() {
  const products = await getInStockProducts();
  return <FilteredProducts data={products} />;
}

async function ProductFiltersWrapper() {
  const availableTags = await getAllTagsWithProducts();
  return <ProductFilters availableTags={availableTags} />;
}

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    tags?: string | string[];
    sort?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const { search, tags, sort } = await searchParams;

  // Parse tags - it might be a string or array depending on URL format
  const parsedTags = Array.isArray(tags)
    ? tags
    : tags
      ? tags.split(",").filter(Boolean)
      : [];

  // Get filtered products to find the first one for image
  const filteredProducts = await getFilteredProductsForMetadata(
    search,
    parsedTags,
    sort,
  );
  const firstProduct = filteredProducts[0];

  // Build dynamic title based on filters
  let title = "Browse Products";
  let description =
    "Discover a wide range of products and services from our local partners";

  if (search) {
    title = `Search results for "${search}"`;
    description = `Find products matching "${search}" from our local partners`;
  }

  if (parsedTags && parsedTags.length > 0) {
    const tagLabels = parsedTags.join(", ");
    if (search) {
      title += ` in ${tagLabels}`;
      description += ` in ${tagLabels} categories`;
    } else {
      title = `${tagLabels} Products`;
      description = `Browse ${tagLabels} products from our local partners`;
    }
  }

  // Add sort information if not default
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
    description = `${filteredProducts.length} product${
      filteredProducts.length > 1 ? "s" : ""
    } found`;
    if (firstProduct) {
      description += `. Featuring: ${firstProduct.name} from ${
        firstProduct.organization?.name || "local partner"
      }`;
    }
  } else {
    description = "No product found matching your criteria";
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

  return {
    title: `${title} - Starva.shop`,
    description,
    openGraph: {
      title: `${title} - Starva.shop`,
      description,
      url: `https://starva.shop/products${
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
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    tags?: string | string[];
    sort?: string;
  }>;
}) {
  const { search, tags } = await searchParams;

  // Parse tags - it might be a string or array depending on URL format
  const parsedTags = Array.isArray(tags)
    ? tags
    : tags
      ? tags.split(",").filter(Boolean)
      : [];

  return (
    <>
      <DynamicHeading initialSearch={search} initialTags={parsedTags} />

      <div className="mb-8">
        <Suspense
          fallback={
            <div className="h-32 rounded-lg border bg-background animate-pulse" />
          }
        >
          <ProductFiltersWrapper />
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
          <ProductsList />
        </Suspense>
      </div>
    </>
  );
}

export default async function ProductsPage({
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
        <ProductsPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
