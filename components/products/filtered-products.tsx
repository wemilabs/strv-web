"use client";

import { usePathname } from "next/navigation";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { Activity } from "react";
import type { Product } from "@/db/schema";
import { ProductCard } from "./product-card";

type ProductWithOrg = Product & {
  organization?: {
    id: string;
    name: string;
    logo: string | null;
    slug: string;
  } | null;
  isLiked?: boolean;
  tags?: Array<{ id: string; slug: string; name: string }>;
};

type FilteredProductsProps = {
  data: ProductWithOrg[];
  defaultStatus?: string;
  layout?: "grid" | "horizontal-scroll";
  searchQuery?: string;
  highlightMatches?: boolean;
};

export function FilteredProducts({
  data,
  defaultStatus = "all",
  layout = "grid",
  searchQuery,
  highlightMatches = false,
}: FilteredProductsProps) {
  const [{ search, tags, sort, status }] = useQueryStates(
    {
      search: parseAsString.withDefault(""),
      tags: parseAsArrayOf(parseAsString).withDefault([]),
      sort: parseAsString.withDefault("newest"),
      status: parseAsString.withDefault(defaultStatus),
    },
    { shallow: false },
  );

  const pathname = usePathname();

  const effectiveSearch = searchQuery !== undefined ? searchQuery : search;

  let filteredProducts = data?.filter(product => {
    const matchesSearch =
      !effectiveSearch ||
      product.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      product.description
        ?.toLowerCase()
        .includes(effectiveSearch.toLowerCase()) ||
      product.organization?.name
        .toLowerCase()
        .includes(effectiveSearch.toLowerCase()) ||
      product.tags?.some(tag =>
        tag.name.toLowerCase().includes(effectiveSearch.toLowerCase()),
      ) ||
      product.brand?.toLowerCase().includes(effectiveSearch.toLowerCase());

    const matchesStatus =
      !status || status === "all" || product.status === status;

    const matchesTags =
      tags.length === 0 ||
      (product.tags?.some(tag => tags.includes(tag.slug)) ?? false);

    return matchesSearch && matchesStatus && matchesTags;
  });

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

  const isStoresPage = pathname === `/stores/${data[0]?.organization?.slug}`;
  const isProductsPage =
    pathname === "/products" || pathname === "/products?search=";

  if (!filteredProducts?.length)
    return (
      <>
        <Activity mode={isProductsPage ? "visible" : "hidden"}>
          <p className="col-span-full text-sm text-muted-foreground mb-4 font-mono tracking-tighter">
            Showing 0 product
          </p>
        </Activity>
        <div className="w-full sm:col-span-full flex items-center justify-center min-h-[200px] border border-dashed border-muted-foreground/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center font-mono tracking-tighter">
            No product found
          </p>
        </div>
      </>
    );

  return (
    <>
      <Activity mode={isProductsPage ? "visible" : "hidden"}>
        <div className="col-span-full text-sm text-pretty text-muted-foreground font-mono tracking-tighter">
          Showing {filteredProducts.length} product
          {filteredProducts.length <= 1 ? "" : "s"}
        </div>
      </Activity>
      {filteredProducts?.map(product => (
        <div
          key={product.id}
          className={`
            ${
              layout === "horizontal-scroll"
                ? "shrink-0 w-72 sm:shrink sm:w-auto"
                : ""
            }
            ${
              highlightMatches && effectiveSearch
                ? "animate-in fade-in-0 slide-in-from-4 duration-300"
                : ""
            }
          `}
        >
          <ProductCard
            {...product}
            href={!isStoresPage ? product.slug : undefined}
            className={
              highlightMatches && effectiveSearch
                ? "ring-2 ring-primary/40 hover:ring-primary/80 transition-all duration-300"
                : ""
            }
          />
        </div>
      ))}
    </>
  );
}
