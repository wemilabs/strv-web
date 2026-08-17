"use client";

import { Play } from "lucide-react";
import { Activity, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProtectedImage } from "@/components/ui/protected-image";
import { FALLBACK_PRODUCT_IMG_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ImageCarousel } from "./image-carousel";

interface ProductGalleryProps {
  images: string[] | null;
  video?: string | null;
  alt: string;
}

export function ProductGallery({ images, video, alt }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageUrls = (images || []).filter(Boolean);
  const hasImages = imageUrls.length > 0;
  const totalItems = imageUrls.length + (video ? 1 : 0);
  const showControls = totalItems > 1;

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  if (!hasImages) {
    return (
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <ProtectedImage
          src={FALLBACK_PRODUCT_IMG_URL}
          alt={alt}
          className="size-full object-cover"
          width={500}
          height={500}
          preload
        />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Activity mode={showControls ? "visible" : "hidden"}>
        <div className="flex flex-col gap-2 w-20">
          {imageUrls.map((imageUrl, index) => (
            <Button
              key={imageUrl}
              variant="ghost"
              size="icon"
              onClick={() => goToImage(index)}
              className={cn(
                "relative aspect-square h-auto w-full overflow-hidden rounded-md border-2 p-0 transition-all hover:scale-105",
                index === currentIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-muted-foreground/30",
              )}
              aria-label={`Go to image ${index + 1}`}
            >
              <ProtectedImage
                src={imageUrl}
                alt={`${alt} - Image ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
                onContextMenu={e => e.preventDefault()}
              />
            </Button>
          ))}
          {video && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToImage(imageUrls.length)}
              className={cn(
                "relative aspect-square h-auto w-full overflow-hidden rounded-md border-2 p-0 transition-all hover:scale-105",
                currentIndex === imageUrls.length
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-muted-foreground/30",
              )}
              aria-label="Go to video"
            >
              <video
                src={video}
                className="absolute inset-0 size-full object-cover"
                muted
              >
                <track kind="captions" />
              </video>
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="size-4 text-white" />
              </div>
            </Button>
          )}
        </div>
      </Activity>

      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted flex-1">
        <ImageCarousel
          images={imageUrls}
          video={video}
          alt={alt}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
        />
      </div>
    </div>
  );
}
