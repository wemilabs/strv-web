import { Suspense } from "react";
import { Hero } from "@/components/hero";

export const instant = true;

import { LatestProducts } from "@/components/products/latest-products";
import { SkeletonProductCard } from "@/components/products/skeleton-product-card";

export default async function Home() {
  return (
    <div>
      <Hero />
      <Suspense
        fallback={
          <section className="mx-auto flex w-full max-w-316 flex-1 flex-col gap-4 mt-8">
            <div className="flex flex-col gap-1 py-2">
              <h2 className="font-medium tracking-tight text-xl">
                Latest Products
              </h2>
              <p className="text-xs text-pretty text-muted-foreground font-mono tracking-tighter">
                Loading latest products...
              </p>
            </div>
            <div className="flex w-full flex-col gap-6 flex-1">
              <div className="flex-1">
                <div className="grid grid-cols-1 justify-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <SkeletonProductCard />
                  <SkeletonProductCard />
                  <SkeletonProductCard />
                  <SkeletonProductCard />
                  <SkeletonProductCard />
                  <SkeletonProductCard />
                </div>
              </div>
            </div>
          </section>
        }
      >
        <LatestProducts />
      </Suspense>
    </div>
  );
}
