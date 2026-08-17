"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

import { SearchForm } from "@/components/forms/search-form";
import type { Order, OrderItem } from "@/db/schema";
import { ORDER_STATUS_VALUES } from "@/lib/constants";

import { OrderCard } from "./order-card";
import { OrderFilters } from "./order-filters";

interface OrderListProps {
  orders: (Order & {
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
  })[];
  variant?: "customer" | "merchant";
}

export function OrderList({ orders, variant = "merchant" }: OrderListProps) {
  const [selectedStatus, setSelectedStatus] = useQueryState(
    "status",
    parseAsStringLiteral(["all", ...ORDER_STATUS_VALUES]).withDefault("all"),
  );
  const [search] = useQueryState("search", { defaultValue: "" });

  const filteredOrders = orders.filter(order => {
    const matchesStatus =
      selectedStatus === "all" || order.status === selectedStatus;
    const matchesSearch =
      search === "" ||
      order.orderNumber.toString().includes(search) ||
      (variant === "merchant" && order.user
        ? order.user.name.toLowerCase().includes(search.toLowerCase()) ||
          order.user.email.toLowerCase().includes(search.toLowerCase())
        : false) ||
      (variant === "customer" && order.organization
        ? order.organization.name.toLowerCase().includes(search.toLowerCase())
        : false);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <OrderFilters
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />
        <SearchForm
          formProps={{
            className: "w-full md:w-80",
          }}
          inputFieldOnlyClassName="h-9"
          placeholder="eg. order number, customer name, etc."
        />
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 flex items-center justify-center border border-dashed rounded-md mt-6">
          <p className="text-muted-foreground font-mono tracking-tighter">
            No order found matching your search
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map(order => (
            <OrderCard key={order.id} order={order} variant={variant} />
          ))}
        </div>
      )}
    </div>
  );
}
