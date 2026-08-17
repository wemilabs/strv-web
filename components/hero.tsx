import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { HERO_IMAGES } from "@/lib/constants";
import { AnimatedGroup } from "./animated-group";
import { SearchForm } from "./forms/search-form";
import { HeroCarousel } from "./hero-carousel";
import { TextEffect } from "./text-effect";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export async function Hero() {
  "use cache";
  cacheLife("max");

  return (
    <section className="overflow-hidden [--color-primary-foreground:var(--color-white)] [--color-primary:var(--color-orange-600)] rounded-lg">
      <div className="relative mx-auto max-w-full px-6 py-20 lg:pt-30">
        <HeroCarousel images={[...HERO_IMAGES]} interval={4000} />
        <div className="absolute top-0 left-0 w-full h-full bg-black/50" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <TextEffect
            preset="fade-in-blur"
            speedSegment={0.3}
            as="h1"
            per="word"
            className="mx-auto text-balance text-4xl font-semibold md:text-5xl lg:text-7xl tracking-wide lg:tracking-wider text-primary-foreground"
          >
            Search. Shop. Smile.
          </TextEffect>
          <TextEffect
            per="line"
            preset="fade-in-blur"
            speedSegment={0.3}
            delay={0.5}
            as="p"
            className="mx-auto mt-2 max-w-2xl text-sm sm:text-base text-pretty text-primary-foreground font-mono tracking-tighter"
          >
            Discover local gems. Expand your store reach.
          </TextEffect>

          <AnimatedGroup
            variants={{
              container: {
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.75,
                  },
                },
              },
              ...transitionVariants,
            }}
            className="mt-6"
          >
            <Suspense fallback={<div className="h-10 md:h-12" />}>
              <SearchForm
                formProps={{ className: "mx-auto max-w-lg" }}
                inputFieldOnlyClassName="h-10 md:h-12"
                controlledAutoFocus
                placeholder="eg. vosgienne, odika, pizza, etc."
              />
            </Suspense>
          </AnimatedGroup>
        </div>
      </div>
    </section>
  );
}
