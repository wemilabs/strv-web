import { CheckCircle, Clock, Package, Wallet2 } from "lucide-react";
import Link from "next/link";
import { Activity } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Order, OrderItem } from "@/db/schema";
import { formatPriceInRWF, formatRelativeTime } from "@/lib/utils";
import { OrderStatusBadge } from "./order-status-badge";

interface OrderCardProps {
  order: Order & {
    user?: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
    organization?: {
      id: string;
      name: string;
      slug: string;
      logo: string | null;
    };
    orderItems: (OrderItem & {
      product: {
        id: string;
        name: string;
        imageUrls: string[] | null;
        price: string;
      };
    })[];
    merchantOrderNumber?: number;
    customerOrderNumber?: number;
  };
  variant?: "customer" | "merchant";
}

export function OrderCard({ order, variant = "merchant" }: OrderCardProps) {
  const itemCount = order.orderItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const orderNumber =
    variant === "merchant"
      ? order.merchantOrderNumber
      : order.customerOrderNumber;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <Link href={`/point-of-sales/orders/${order.id}`}>
        <CardHeader className="-mt-1">
          <div className="flex items-center justify-between space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-lg">#{orderNumber}</h3>
              <OrderStatusBadge status={order.status} />
              <Activity mode={order.isPaid ? "visible" : "hidden"}>
                <Badge variant="successful">
                  <CheckCircle className="size-3" />
                  Paid
                </Badge>
              </Activity>
            </div>
            <div className="flex items-center gap-1 font-medium text-lg">
              <Wallet2 className="size-4" />
              {formatPriceInRWF(order.totalPrice)}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground justify-between">
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatRelativeTime(order.createdAt)}
            </div>
            <div className="flex items-center gap-1">
              <Package className="size-3" />
              {itemCount} item{itemCount <= 1 ? "" : "s"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 -mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {variant === "merchant" && order.user ? (
                <>
                  <Avatar className="size-8">
                    <AvatarImage src={order.user.image || undefined} />
                    <AvatarFallback>
                      {order.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{order.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.user.email}
                    </p>
                  </div>
                </>
              ) : variant === "customer" && order.organization ? (
                <>
                  <Avatar className="size-8">
                    <AvatarImage src={order.organization.logo || undefined} />
                    <AvatarFallback>
                      {order.organization.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {order.organization.name}
                    </p>
                    <p className="text-xs text-muted-foreground">store</p>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {order.notes && (
            <div className="mt-3 p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Note:</span> {order.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
