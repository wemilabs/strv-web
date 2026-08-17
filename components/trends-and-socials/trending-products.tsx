"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";

import { fetchTrendingProducts } from "@/server/trends";
import { ProductCard } from "../products/product-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Skeleton } from "../ui/skeleton";

const TrendingProductsContent = () => {
  const { data: products = [], isLoading } = useQuery<
    Awaited<ReturnType<typeof fetchTrendingProducts>>
  >({
    queryKey: ["trending-products"],
    queryFn: () => fetchTrendingProducts(20, 7),
    // staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-50" />
        <Skeleton className="h-50" />
        <Skeleton className="h-50" />
        <Skeleton className="h-50" />
        <Skeleton className="h-50" />
        <Skeleton className="h-50" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Empty className="min-h-[400px] border border-dashed border-muted-foreground/50">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrendingUp className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No trending products</EmptyTitle>
          <EmptyDescription className="font-mono tracking-tighter">
            Check back later for trending products.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          {...product}
          href={`/products/${product.slug}`}
        />
      ))}
    </div>
  );
};

export default TrendingProductsContent;
