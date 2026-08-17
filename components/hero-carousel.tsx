"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface HeroCarouselProps {
  images: Array<{
    src: string;
    alt: string;
  }>;
  interval?: number;
  className?: string;
}

export function HeroCarousel({
  images,
  interval = 5000,
  className = "",
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images, interval]);

  if (images.length === 0) return null;

  return (
    <div className={`absolute inset-0 ${className}`}>
      {images.map((image, index) => (
        <Image
          key={`${image.src}-${image.src.slice(-10)}`}
          src={image.src}
          alt={image.alt}
          width={1000}
          height={1000}
          className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
          preload={index === 0}
          loading="eager"
        />
      ))}
    </div>
  );
}
