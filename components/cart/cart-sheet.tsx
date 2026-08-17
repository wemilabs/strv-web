"use client";

import { ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { type CartItem, useCartStore } from "@/lib/cart-store";
import { FALLBACK_PRODUCT_IMG_URL } from "@/lib/constants";
import { calculateOrderFees, formatPriceInRWF } from "@/lib/utils";
import { getProductsStock } from "@/server/inventory";
import { placeOrder } from "@/server/orders";
import { Separator } from "../ui/separator";
import { Spinner } from "../ui/spinner";

export function CartSheet() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [mounted, setMounted] = useState(false);

  const {
    items,
    removeItem,
    updateQuantity,
    updateNotes,
    clearCart,
    getTotalPrice,
    getItemCount,
    refreshStock,
  } = useCartStore();

  const totalPrice = getTotalPrice();
  const itemCount = getItemCount();
  const fees = calculateOrderFees(totalPrice);

  const getItemDisplayPrice = (item: CartItem) => {
    if (item.category === "real-estate") {
      if (!item.isLandlord)
        return `${formatPriceInRWF(Number(item.price))} + ${formatPriceInRWF(
          Number(item.visitFees),
        )} fees`;
      else return formatPriceInRWF(Number(item.price));
    }
    return formatPriceInRWF(Number(item.price));
  };

  const getItemDisplaySubtotal = (item: CartItem) =>
    formatPriceInRWF(Number(item.price) * item.quantity);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    try {
      updateQuantity(productId, newQuantity);
    } catch (error: unknown) {
      const e = error as Error;
      toast.error("Cannot update quantity", {
        description: e.message || "Failed to update quantity",
      });
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Refresh stock levels when cart opens
  useEffect(() => {
    if (isOpen && items.length > 0 && session?.session?.activeOrganizationId) {
      const productIds = items.map(item => item.productId);
      getProductsStock({
        productIds,
        organizationId: session.session.activeOrganizationId,
      }).then(result => {
        if (result.ok) {
          refreshStock([...result.stocks]);
        }
      });
    }
  }, [isOpen, items, session?.session?.activeOrganizationId, refreshStock]);

  const handlePlaceOrder = () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (!session?.user) {
      toast.error("Unauthorized access", {
        description: "You will be redirected to sign in to place an order",
      });
      router.push("/sign-in");
      return;
    }

    startTransition(async () => {
      const result = await placeOrder({
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
        })),
        notes: orderNotes,
      });

      if (!result.ok) {
        console.error(result.error);
        toast.error("Failed to place order", {
          description:
            typeof result.error === "string"
              ? result.error
              : "Please try again later.",
        });
        return;
      }

      if (result.stockWarnings && result.stockWarnings.length > 0)
        toast.warning("Stock availability notice", {
          description: result.stockWarnings.join(" "),
          duration: 8000,
        });

      if (result.ok) {
        clearCart();
        setIsOpen(false);
        setOrderNotes("");
        toast.success("Order placed successfully!", {
          description:
            "Your order has been received and will be processed soon.",
        });
        router.push("/point-of-sales/orders");
      } else {
        console.error(result.error);
        toast.error("Failed to place order", {
          description:
            typeof result.error === "string"
              ? result.error
              : "Please try again later.",
        });
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative border-none shadow-none bg-transparent hover:bg-muted"
        >
          <ShoppingBag className="size-4" />
          {mounted && itemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 size-4 flex items-center justify-center text-xs"
              title="Items in cart"
            >
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full flex-col">
        <SheetHeader className="text-left">
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription className="font-mono tracking-tighter">
            {itemCount === 0
              ? "Your cart is empty"
              : `${itemCount} item${itemCount > 1 ? "s" : ""} in your cart`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <ShoppingBag className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-mono tracking-tighter">
              Your cart is empty. Start adding products!
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 h-[calc(100%-29rem)] px-4">
              <div className="space-y-4">
                {items.map(item => (
                  <div
                    key={item.productId}
                    className="space-y-3 rounded-lg border p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative size-16 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={
                            item.productImages?.[0] ?? FALLBACK_PRODUCT_IMG_URL
                          }
                          alt={item.productName}
                          width={64}
                          height={64}
                          className="size-full object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">
                            {item.productName}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono tracking-tighter">
                          {getItemDisplayPrice(item)}
                        </p>
                        {item.category === "real-estate" && (
                          <p className="text-xs text-blue-600">
                            {item.isLandlord
                              ? "Contact landlord directly for payment"
                              : "Visit fees will be charged at checkout"}
                          </p>
                        )}
                        {item.inventoryEnabled &&
                          item.currentStock !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              {item.currentStock} in stock
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            handleQuantityChange(
                              item.productId,
                              item.quantity - 1,
                            )
                          }
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={
                            item.inventoryEnabled &&
                            item.currentStock !== undefined
                              ? item.currentStock
                              : undefined
                          }
                          value={item.quantity}
                          onChange={e =>
                            handleQuantityChange(
                              item.productId,
                              Number.parseInt(e.target.value, 10) || 1,
                            )
                          }
                          className="w-16 text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            handleQuantityChange(
                              item.productId,
                              item.quantity + 1,
                            )
                          }
                        >
                          +
                        </Button>
                      </div>
                      <p className="ml-auto text-sm font-medium font-mono tracking-tighter">
                        {getItemDisplaySubtotal(item)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor={`notes-${item.productId}`}
                        className="text-xs"
                      >
                        Item note{" "}
                        <span className="text-muted-foreground font-mono tracking-tighter">
                          (optional)
                        </span>
                      </Label>
                      <Textarea
                        id={`notes-${item.productId}`}
                        value={item.notes || ""}
                        onChange={e =>
                          updateNotes(item.productId, e.target.value)
                        }
                        placeholder="Special instructions..."
                        rows={2}
                        className="placeholder:text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="space-y-2 px-4">
              <div className="space-y-2">
                <Label htmlFor="order-notes" className="text-sm">
                  Order notes{" "}
                  <span className="text-muted-foreground font-mono tracking-tighter text-xs">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="order-notes"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="Any special instructions for the entire order..."
                  rows={3}
                  className="placeholder:text-sm"
                />
              </div>

              {/* Real estate pricing explanation */}
              {items.some(item => item.category === "real-estate") && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs">
                  <p className="font-medium text-blue-900 mb-1">
                    Real Estate Pricing:
                  </p>
                  <ul className="space-y-1 text-blue-800">
                    {items.some(
                      item =>
                        item.category === "real-estate" && !item.isLandlord,
                    ) && (
                      <li>
                        • Visit arrangement fees will be charged at checkout
                      </li>
                    )}
                    {items.some(
                      item =>
                        item.category === "real-estate" && item.isLandlord,
                    ) && (
                      <li>
                        • Property payments are handled directly with landlords
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="rounded-lg bg-muted px-3 py-2 space-y-1 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono tracking-tighter">
                    {formatPriceInRWF(fees.baseAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Processing fee (7.4%)
                  </span>
                  <span className="font-mono tracking-tighter">
                    {formatPriceInRWF(fees.totalFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t font-bold">
                  <span>Total</span>
                  <span className="text-lg">
                    {formatPriceInRWF(fees.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <SheetFooter>
              <Button
                onClick={handlePlaceOrder}
                disabled={isPending || items.length === 0}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Spinner />
                    Placing order...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="size-4" />
                    Place Order
                  </>
                )}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
