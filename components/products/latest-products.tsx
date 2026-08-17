import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getLatestProductsByCategory } from "@/data/products";
import { LatestProductsContent } from "./latest-products-content";
import { SkeletonProductCard } from "./skeleton-product-card";

function LatestProductsSkeleton() {
  return (
    <section className="mx-auto flex w-full max-w-[1264px] flex-1 flex-col gap-4 mt-8">
      <div className="flex flex-col gap-1 py-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium tracking-tight text-xl">
            Latest Products
            <span className="sr-only font-mono tracking-tighter">
              Browse the newest products across all categories
            </span>
          </h2>
        </div>
        <p className="text-xs text-pretty text-muted-foreground font-mono tracking-tighter">
          Discover the newest additions across all categories
        </p>

        <div className="w-full pt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-5" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>

              <div className="flex w-full flex-col gap-6 flex-1">
                <div className="flex-1 pt-4">
                  <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto scrollbar-hide sm:overflow-visible">
                    {[1, 2, 3, 4, 5, 6].map(j => (
                      <div
                        key={j}
                        className="shrink-0 w-72 sm:shrink sm:w-auto"
                      >
                        <SkeletonProductCard />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function LatestProducts() {
  const categoriesWithProducts = await getLatestProductsByCategory();

  return (
    <Suspense fallback={<LatestProductsSkeleton />}>
      <LatestProductsContent categoriesWithProducts={categoriesWithProducts} />
    </Suspense>
  );
}
