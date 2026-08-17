"use client";

import type { VariantProps } from "class-variance-authority";
import { Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import type { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleProductLike } from "@/server/products";

type ProductLikeButtonProps = {
  productId: string;
  initialIsLiked: boolean;
  initialLikesCount: number;
  revalidateTargetPath: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
};

type OptimisticState = {
  isLiked: boolean;
  likesCount: number;
};

export function ProductLikeButton({
  productId,
  initialIsLiked,
  initialLikesCount,
  revalidateTargetPath,
  variant,
}: ProductLikeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticState, setOptimisticState] = useOptimistic<
    OptimisticState,
    OptimisticState
  >(
    { isLiked: initialIsLiked, likesCount: initialLikesCount },
    (_, newState) => newState,
  );

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIsLiked = !optimisticState.isLiked;
    const newLikesCount = newIsLiked
      ? optimisticState.likesCount + 1
      : Math.max(0, optimisticState.likesCount - 1);

    startTransition(async () => {
      setOptimisticState({
        isLiked: newIsLiked,
        likesCount: newLikesCount,
      });

      const result = await toggleProductLike({
        productId,
        revalidateTargetPath,
      });

      if (!result.ok) {
        console.error("Failed to toggle like:", result.error);
        toast.error("Failed to toggle like", {
          description:
            typeof result.error === "string"
              ? result.error
              : "Oops! Something went wrong",
        });
      }
    });
  };

  return (
    <Button
      type="button"
      onClick={handleLike}
      disabled={isPending}
      aria-label={optimisticState.isLiked ? "Unlike product" : "Like product"}
      variant={variant}
    >
      <Heart
        className={cn(
          "transition-colors size-4",
          optimisticState.isLiked && "text-primary",
        )}
        fill={optimisticState.isLiked ? "var(--primary)" : "none"}
        aria-hidden="true"
      />
      <span className={cn("text-sm", variant === "compact" && "text-xs")}>
        {optimisticState.likesCount}
      </span>
    </Button>
  );
}
