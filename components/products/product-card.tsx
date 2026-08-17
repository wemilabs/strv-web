import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Activity } from "react";
import { ImageCarousel } from "@/components/products/image-carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Product } from "@/db/schema";
import { FALLBACK_PRODUCT_IMG_URL } from "@/lib/constants";
import {
  cn,
  formatPriceInRWF,
  getInitials,
  removeUnderscoreAndCapitalizeOnlyTheFirstChar,
} from "@/lib/utils";
import { DeleteProductForm } from "../forms/delete-product-form";
import { EditProductForm } from "../forms/edit-product-form";
import { AddToCartButton } from "./add-to-cart-button";
import { ProductDetailsLink } from "./product-details-link";
import { ProductLikeButton } from "./product-like-button";

type ProductCardProps = Product & {
  organization?: {
    id: string;
    name: string;
    logo: string | null;
    slug: string;
  } | null;
  href?: string;
  isLiked?: boolean;
  className?: string;
};

export function ProductCard({
  id,
  name,
  slug,
  imageUrls,
  videoUrl,
  price,
  description,
  likesCount,
  status,
  category,
  specifications,
  isLandlord,
  visitFees,
  organization,
  createdAt,
  updatedAt,
  calories,
  brand,
  organizationId,
  unitFormatId,
  inventoryEnabled,
  currentStock,
  lowStockThreshold,
  href,
  isLiked = false,
  className,
}: ProductCardProps) {
  const priceNumber = Number(price) ?? 0;
  const visitFeesNumber = Number(visitFees) ?? 0;

  const orgName = organization?.name ?? null;
  const orgLogo = organization?.logo ?? null;

  const customCardContent = (
    <>
      <div className="relative aspect-video">
        <Image
          src={imageUrls?.[0] ?? FALLBACK_PRODUCT_IMG_URL}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          preload
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-tr from-black/70 via-black/30 to-transparent" />
      </div>
      <div className="absolute inset-0 flex flex-col p-4 text-white gap-y-3 md:gap-y-4">
        <div className="flex items-center justify-between gap-2 mb-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-xs font-medium tracking-wide text-white/90 ring-1 ring-white/15 backdrop-blur-sm shrink-0">
            <span
              className={cn("size-1.5 rounded-full shrink-0", {
                "bg-blue-500": status === "draft",
                "bg-green-600": status === "in_stock",
                "bg-red-600": status === "out_of_stock",
                "bg-gray-600": status === "archived",
              })}
            />
            <span className="truncate max-w-[20ch]">
              {removeUnderscoreAndCapitalizeOnlyTheFirstChar(status)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs font-medium font-mono tracking-wide text-white/90 ring-1 ring-white/15 backdrop-blur-sm shrink-0">
              <span className="truncate max-w-[24ch]">
                {formatPriceInRWF(priceNumber)}
              </span>
            </div>

            {!href ? (
              <>
                {/** biome-ignore lint/a11y/noStaticElementInteractions: actually needed */}
                {/** biome-ignore lint/a11y/useKeyWithClickEvents: actually needed */}
                <div
                  className="flex items-center gap-1.5"
                  onClick={e => e.stopPropagation()}
                >
                  <EditProductForm
                    product={{
                      id,
                      name,
                      slug,
                      price,
                      imageUrls,
                      videoUrl,
                      description,
                      status,
                      category,
                      likesCount,
                      createdAt,
                      organizationId,
                      calories,
                      updatedAt,
                      specifications,
                      brand,
                      unitFormatId,
                      inventoryEnabled,
                      currentStock,
                      lowStockThreshold,
                      isLandlord,
                      visitFees,
                    }}
                    organizationId={organization?.id || ""}
                    storeSlug={organization?.slug || ""}
                    className="size-6 p-0 rounded-full bg-white/40 hover:bg-white/50 text-white/90 border-white/45"
                  />
                  <DeleteProductForm
                    productId={id}
                    organizationId={organization?.id || ""}
                    storeSlug={organization?.slug || ""}
                    className="size-6 p-0 rounded-full bg-red-600/70 hover:bg-red-600/80 text-red-100 ring-1 ring-red-600/80 flex-none flex items-center justify-center"
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-end">
          <h3 className="text-balance text-lg md:text-xl font-semibold leading-tight line-clamp-1 min-w-0 flex-1">
            {name}
          </h3>
          <Activity mode={description ? "visible" : "hidden"}>
            <p className="mt-2 max-w-[46ch] text-xs text-white/80 font-mono tracking-tighter line-clamp-1">
              {description}
            </p>
          </Activity>

          <div className="mt-4 flex items-center justify-between">
            <Link
              href={`/merchants/${organization?.slug}` as Route}
              className="inline-flex items-center gap-2 rounded-full bg-black/30 ring-1 ring-white/10 backdrop-blur-sm"
            >
              <Avatar className="size-9 ring-1 ring-white/20">
                <AvatarImage
                  src={orgLogo ?? ""}
                  alt={orgName ?? ""}
                  className="object-cover"
                />
                <AvatarFallback className="text-muted-foreground text-xs">
                  {getInitials(orgName)}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="inline-flex items-center gap-1">
              {href ? (
                <ProductLikeButton
                  productId={id}
                  initialIsLiked={isLiked}
                  initialLikesCount={likesCount ?? 0}
                  revalidateTargetPath="/"
                  variant="compact"
                />
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-white/90 ring-1 ring-white/10 backdrop-blur-sm">
                  <span className="text-[11px]">{likesCount ?? 0}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative">
      <Dialog>
        <DialogTrigger asChild>
          <Card className={cn("group relative overflow-hidden p-0", className)}>
            {customCardContent}
          </Card>
        </DialogTrigger>
        <DialogContent
          className="flex h-[calc(100vh-10rem)] flex-col gap-0 p-0 md:flex-row border-none md:h-[calc(100vh-20rem)] md:max-w-3xl md:w-full lg:max-w-4xl"
          aria-describedby={undefined}
        >
          <div className="relative aspect-square overflow-hidden md:aspect-auto md:w-1/2">
            <ImageCarousel
              images={imageUrls}
              alt={name}
              video={videoUrl}
              className="rounded-t-lg md:rounded-l-lg md:rounded-r-none"
            />
          </div>

          <div className="flex flex-1 flex-col justify-between gap-5 p-6 md:py-8">
            <div className="flex flex-col gap-2">
              {organization?.name && (
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {organization.name}
                </p>
              )}
              <DialogTitle className="text-balance text-2xl font-medium leading-tight tracking-tight line-clamp-2">
                {name}
              </DialogTitle>
              {description && (
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-1 font-mono tracking-tighter">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 justify-between">
              <div className="flex flex-col">
                <p className="text-3xl font-medium text-primary/90">
                  {formatPriceInRWF(priceNumber)}
                </p>
                <Activity
                  mode={category === "real-estate" ? "visible" : "hidden"}
                >
                  <p className="text-sm text-muted-foreground">
                    {isLandlord
                      ? "Contact landlord directly"
                      : `Property price (paid to landlord)`}
                  </p>
                </Activity>
              </div>
              <Activity
                mode={
                  category === "real-estate" &&
                  !isLandlord &&
                  visitFeesNumber > 0
                    ? "visible"
                    : "hidden"
                }
              >
                <div className="flex flex-col">
                  <p className="text-lg font-medium text-blue-600">
                    {formatPriceInRWF(visitFeesNumber)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Visit arrangement fee
                  </p>
                </div>
              </Activity>
            </div>

            <Activity mode={href ? "visible" : "hidden"}>
              <div className="flex flex-col gap-1.5">
                <AddToCartButton
                  product={{
                    id,
                    name,
                    slug,
                    price,
                    imageUrls,
                    category,
                    isLandlord,
                    visitFees: visitFees || "0",
                    currentStock,
                    inventoryEnabled,
                  }}
                />
                <ProductDetailsLink href={href} />
              </div>
            </Activity>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
