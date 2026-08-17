import { CalendarClock, MessageCircle, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Suspense } from "react";
import { AddToCartButton } from "@/components/products/add-to-cart-button";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductLikeButton } from "@/components/products/product-like-button";
import { ProductSlugSkeleton } from "@/components/products/product-slug-skeleton";
import { ShareDialog } from "@/components/share-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductBySlug } from "@/data/products";
import { FALLBACK_PRODUCT_IMG_URL } from "@/lib/constants";
import {
  formatPriceInRWF,
  getCategoryLabel,
  getCategorySpecificationLabel,
  removeUnderscoreAndCapitalizeOnlyTheFirstChar,
} from "@/lib/utils";

export const instant = true;

async function ProductDisplay({ productSlug }: { productSlug: string }) {
  const product = await getProductBySlug(productSlug);

  if (!product) return notFound();

  //  const relatedProducts = await getRelatedProducts(product.organizationId, product.id, 10);

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ProductGallery
          images={product.imageUrls}
          video={product.videoUrl}
          alt={product.name}
        />

        <div className="flex flex-col gap-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>

          <div className="text-2xl font-medium flex gap-x-2">
            <div>{formatPriceInRWF(product.price)}</div>
            <Activity
              mode={
                product.category === "real-estate" &&
                !product.isLandlord &&
                Number(product.visitFees) > 0
                  ? "visible"
                  : "hidden"
              }
            >
              <div className="text-sm text-blue-600">
                + {formatPriceInRWF(Number(product.visitFees))} visit fees
              </div>
            </Activity>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {getCategoryLabel(product.category)}
            </Badge>
            <Badge variant="available" className="text-xs">
              {removeUnderscoreAndCapitalizeOnlyTheFirstChar(product.status)}
            </Badge>
          </div>

          <div className="prose max-w-none text-sm text-muted-foreground font-mono tracking-tighter">
            <p>{product.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border p-4">
              <p className="text-muted-foreground font-mono tracking-tighter">
                Status
              </p>
              <Badge variant="available" className="mt-1">
                {removeUnderscoreAndCapitalizeOnlyTheFirstChar(product.status)}
              </Badge>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-muted-foreground font-mono tracking-tighter">
                {getCategorySpecificationLabel(product.category)}
              </p>
              <p className="mt-1 font-medium">
                {product.specifications || "N/A"}
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-muted-foreground font-mono tracking-tighter mb-2">
                Likes
              </p>
              <ProductLikeButton
                productId={product.id}
                initialIsLiked={product.isLiked ?? false}
                initialLikesCount={product.likesCount ?? 0}
                revalidateTargetPath={`/products/${product.slug}`}
                variant="outline"
              />
            </div>
            <div className="rounded-md border p-4">
              <p className="text-muted-foreground font-mono tracking-tighter">
                From
              </p>
              <p className="mt-1 font-medium">
                <Link
                  className="underline underline-offset-4 hover:no-underline"
                  href={`/merchants/${product.organization.slug}`}
                >
                  {product.organization.name}
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <AddToCartButton
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                imageUrls: product.imageUrls,
                category: product.category,
                isLandlord: product.isLandlord,
                visitFees: product.visitFees || "0",
                currentStock: product.currentStock,
                inventoryEnabled: product.inventoryEnabled,
              }}
            />

            <Button variant="outline" disabled>
              <CalendarClock className="size-4" />
              Schedule order
            </Button>

            <Button variant="outline" disabled>
              <MessageCircle className="size-4" />
              Chat with seller
            </Button>

            <Button
              className="fixed right-10 bottom-9 z-20 rounded-full size-12"
              disabled
            >
              <Sparkles className="size-4" />
            </Button>

            <ShareDialog
              url={`${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
              }/products/${product.slug}`}
              buttonTitle="Share"
              title={`Share ${product.name}`}
              description={`Share this product with others`}
              variant={{ variant: "outline" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

async function ProductContent({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;
  return <ProductDisplay productSlug={productSlug} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}): Promise<Metadata> {
  const { productSlug } = await params;

  const product = await getProductBySlug(productSlug);
  if (!product) {
    return {
      title: "Product Not Found - Starva.shop",
      description: "The requested product could not be found.",
    };
  }

  const resolvedSlug = product.slug ?? productSlug;
  const title = `${product.name} - Starva.shop`;
  const description = `${product.name}${
    product.description ? ` - ${product.description}` : ""
  }. Price: ${formatPriceInRWF(product.price)}. Available from ${
    product.organization.name
  }. Order now for delivery.`;

  const images: { url: string; width: number; height: number; alt: string }[] =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls.map(url => ({
          url,
          width: 1200,
          height: 630,
          alt: product.name,
        }))
      : [
          {
            url: FALLBACK_PRODUCT_IMG_URL,
            width: 1200,
            height: 630,
            alt: "Starva.shop app - A sure platform for local stores and customers to meet. Easy, fast and reliable.",
          },
        ];

  const productUrl = `${
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  }/products/${resolvedSlug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: productUrl,
      type: "website",
      images,
      siteName: "Starva.shop",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map(img => img.url),
    },
    alternates: {
      canonical: productUrl,
    },
  };
}

export default async function ProductSlugPage(
  props: PageProps<"/products/[productSlug]">,
) {
  return (
    <Suspense fallback={<ProductSlugSkeleton />}>
      <ProductContent params={props.params} />
    </Suspense>
  );
}
