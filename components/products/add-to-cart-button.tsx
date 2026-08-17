"use client";

import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    imageUrls: string[] | null;
    category: string;
    isLandlord: boolean;
    visitFees: string;
    currentStock?: number | null;
    inventoryEnabled?: boolean;
  };
  quantity?: number;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function AddToCartButton({
  product,
  quantity = 1,
  variant = "default",
  className,
}: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const addItem = useCartStore(state => state.addItem);

  const handleAddToCart = () => {
    setIsAdding(true);

    try {
      addItem({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        productImages: product.imageUrls,
        price: product.price,
        category: product.category,
        isLandlord: product.isLandlord,
        visitFees: product.visitFees,
        currentStock: product.currentStock ?? undefined,
        inventoryEnabled: product.inventoryEnabled,
        quantity,
      });

      toast.success(`${product.name} added to cart`, {
        description: `Quantity: ${quantity}`,
      });
    } catch (error: unknown) {
      const e = error as Error;
      toast.error("Cannot add to cart", {
        description: e.message || "Failed to add item to cart",
      });
    } finally {
      setTimeout(() => setIsAdding(false), 500);
    }
  };

  return (
    <Button
      onClick={handleAddToCart}
      disabled={isAdding}
      variant={variant}
      className={className}
    >
      <ShoppingBag className="size-4" />
      {isAdding ? "Adding..." : "Add to Cart"}
    </Button>
  );
}
