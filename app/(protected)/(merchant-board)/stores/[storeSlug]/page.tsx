import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EditableStoreDescription } from "@/components/forms/editable-store-desc";
import { EditableStoreName } from "@/components/forms/editable-store-name";
import { EditableStorePhone } from "@/components/forms/editable-store-phone";
import { UpdateStoreLogoForm } from "@/components/forms/update-store-logo";
import { ProductCatalogueControls } from "@/components/products/product-catalogue-controls";
import { ProductCatalogueSection } from "@/components/products/product-catalogue-section";
import { SkeletonProductCard } from "@/components/products/skeleton-product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductsPerStore } from "@/data/products";
import { getStoreBySlug } from "@/data/stores";
import { GENERAL_BRANDING_IMG_URL } from "@/lib/constants";
import {
  updateStoreDescription,
  updateStoreLogo,
  updateStoreName,
  updateStorePhone,
} from "@/server/stores";

async function ProductsList({ storeId }: { storeId: string }) {
  const productsPerStore = await getProductsPerStore(storeId);

  if ("message" in productsPerStore) {
    return (
      <div className="text-center py-10">
        <h2 className="text-lg font-semibold mb-2">Unable to load products</h2>
        <p className="text-muted-foreground font-mono tracking-tighter">
          {productsPerStore.message}
        </p>
      </div>
    );
  }

  return <ProductCatalogueSection data={productsPerStore} />;
}

async function StoreContent({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) return notFound();

  const resolvedSlug = store.slug || storeSlug;

  const metadata = store.metadata ? JSON.parse(store.metadata) : {};
  const description = metadata.description || "";
  const phoneForNotifications = metadata.phoneForNotifications || "";
  const phoneForPayments = metadata.phoneForPayments || "";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-xl border">
        <div className="absolute inset-0">
          {store.logo ? (
            <Image
              src={store.logo}
              alt={`${store.name} logo`}
              fill
              sizes="100vw"
              unoptimized
              className="object-cover"
              preload
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-orange-500 via-amber-500 to-yellow-500" />
          )}
        </div>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 px-6 py-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="text-white flex flex-col gap-2">
            <EditableStoreName
              storeId={store.id}
              storeSlug={resolvedSlug}
              initialName={store.name}
              updateAction={updateStoreName}
            />
            <p className="text-white/80 text-sm font-mono tracking-tighter">
              @{resolvedSlug}
            </p>
            <EditableStoreDescription
              storeId={store.id}
              storeSlug={resolvedSlug}
              initialDescription={description}
              updateAction={updateStoreDescription}
            />
            <EditableStorePhone
              storeId={store.id}
              storeSlug={resolvedSlug}
              phoneType="notifications"
              initialPhone={phoneForNotifications}
              updateAction={updateStorePhone}
            />
            <EditableStorePhone
              storeId={store.id}
              storeSlug={resolvedSlug}
              phoneType="payments"
              initialPhone={phoneForPayments}
              updateAction={updateStorePhone}
            />
          </div>

          <UpdateStoreLogoForm
            action={updateStoreLogo.bind(null, store.id, resolvedSlug)}
            storeSlug={resolvedSlug}
            className="bg-white/10 backdrop-blur rounded-lg p-3 ring-1 ring-white/15"
          />
        </div>
      </section>

      <section className="grid gap-6 mt-10">
        <Suspense
          fallback={
            <div className="h-20 rounded-lg border bg-background animate-pulse mb-6" />
          }
        >
          <ProductCatalogueControls
            storeId={store.id}
            storeSlug={resolvedSlug}
            storeName={store.name}
            timetable={metadata.timetable}
            defaultStatus="all"
          />
        </Suspense>
        <Suspense
          fallback={
            <>
              <div className="col-span-full text-sm text-pretty text-muted-foreground mb-4 font-mono tracking-tighter">
                Loading products...
              </div>
              <div className="grid grid-cols-1 justify-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <ProductsList storeId={store.id} />
        </Suspense>
      </section>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}): Promise<Metadata> {
  const { storeSlug } = await params;

  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return {
      title: "store Not Found - Starva.shop",
      description: "The requested store could not be found.",
    };
  }

  const resolvedSlug = store.slug ?? storeSlug;
  const metadata = store.metadata ? JSON.parse(store.metadata) : {};
  const description =
    metadata.description ??
    `Manage your store ${store.name}. Update products, track orders, and grow your store with Starva.shop.`;

  const images = [];
  if (store.logo) {
    images.push({
      url: store.logo,
      width: 1200,
      height: 630,
      alt: `${store.name} logo`,
    });
  } else {
    images.push({
      url: GENERAL_BRANDING_IMG_URL,
      width: 1200,
      height: 630,
      alt: "Starva.shop app - A sure platform for local stores and customers to meet. Easy, fast and reliable.",
    });
  }

  const storeUrl = `${
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  }/stores/${resolvedSlug}`;

  return {
    title: `${store.name} - Starva.shop`,
    description,
    openGraph: {
      title: `${store.name} - Starva.shop`,
      description,
      url: storeUrl,
      type: "website",
      images,
      siteName: "Starva.shop",
    },
    twitter: {
      card: "summary_large_image",
      title: `${store.name} - Starva.shop`,
      description,
      images: images.map(img => img.url),
    },
    alternates: {
      canonical: storeUrl,
    },
  };
}

export default async function storeSlugPage(
  props: PageProps<"/stores/[storeSlug]">,
) {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-xl border">
            <Skeleton className="h-64 bg-linear-to-br from-orange-500 via-amber-500 to-yellow-500" />
          </div>
          <div className="grid gap-6 mt-10">
            <Skeleton className="h-20 mb-6" />
            <div className="col-span-full text-sm text-pretty text-muted-foreground mb-4 font-mono tracking-tighter">
              Loading store details...
            </div>
          </div>
        </div>
      }
    >
      <StoreContent params={props.params} />
    </Suspense>
  );
}
