"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Activity, /*useEffect, useRef,*/ useState } from "react";
import { Button } from "@/components/ui/button";
import { ProtectedImage } from "@/components/ui/protected-image";
import { FALLBACK_PRODUCT_IMG_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ImageCarouselProps {
  images: string[] | null;
  video?: string | null;
  alt: string;
  className?: string;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

export function ImageCarousel({
  images,
  video,
  alt,
  className,
  currentIndex: controlledIndex,
  onIndexChange,
}: ImageCarouselProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  // const videoRef = useRef<HTMLVideoElement>(null);

  // Pause video on unmount
  // useEffect(() => {
  //   return () => {
  //     videoRef.current?.pause();
  //   };
  // }, []);

  const isControlled = controlledIndex !== undefined;
  const currentIndex = isControlled ? controlledIndex : internalIndex;

  const setCurrentIndex = (index: number) => {
    if (isControlled && onIndexChange) {
      onIndexChange(index);
    } else {
      setInternalIndex(index);
    }
  };

  const imageUrls = (images || []).filter(Boolean);
  const totalItems = imageUrls.length + (video ? 1 : 0);
  const isVideoSlide = video && currentIndex === imageUrls.length;
  const hasImages = imageUrls.length > 0;
  const currentImage =
    hasImages && !isVideoSlide && imageUrls[currentIndex]
      ? imageUrls[currentIndex]
      : FALLBACK_PRODUCT_IMG_URL;
  const showControls = totalItems > 1;

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? totalItems - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === totalItems - 1 ? 0 : currentIndex + 1);
  };

  return (
    <>
      {isVideoSlide ? (
        <video
          // ref={videoRef}
          src={video}
          controls
          className={cn("absolute inset-0 size-full object-cover", className)}
          onContextMenu={e => e.preventDefault()}
        >
          <track kind="captions" />
        </video>
      ) : (
        <ProtectedImage
          src={currentImage}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          preload
          className={cn("object-cover", className)}
          onContextMenu={e => e.preventDefault()}
        />
      )}

      <Activity mode={showControls ? "visible" : "hidden"}>
        <Button
          variant="compact"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 border-black/20 text-white hover:bg-black/40 hover:border-black/40"
          onClick={goToPrevious}
          aria-label="Previous image"
        >
          <ChevronLeft className="size-4 text-accent-foreground" />
        </Button>

        <Button
          variant="compact"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 border-black/20 text-white hover:bg-black/40 hover:border-black/40"
          onClick={goToNext}
          aria-label="Next image"
        >
          <ChevronRight className="size-4 text-accent-foreground" />
        </Button>
      </Activity>
    </>
  );
}
