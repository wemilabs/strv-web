"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderStatus } from "@/db/schema";
import { statusLabels, validTransitions } from "@/lib/constants";
import { updateOrderStatus } from "@/server/orders";
import { Spinner } from "../ui/spinner";

interface OrderStatusSelectProps {
  orderId: string;
  currentStatus: OrderStatus;
  isPaid?: boolean;
  disabled?: boolean;
}

export function OrderStatusSelect({
  orderId,
  currentStatus,
  isPaid = false,
  disabled,
}: OrderStatusSelectProps) {
  const [isPending, startTransition] = useTransition();

  const nextStatuses = validTransitions[currentStatus] || [];
  const availableOptions = nextStatuses.map(status => ({
    value: status,
    label: statusLabels[status],
    disabled: status === "preparing" && !isPaid,
  }));

  const isTerminalStatus =
    currentStatus === "delivered" || currentStatus === "cancelled";

  const handleStatusChange = (newStatus: OrderStatus) => {
    startTransition(async () => {
      const result = await updateOrderStatus({
        orderId,
        status: newStatus,
      });

      if (result.ok) {
        toast.success("Order status updated successfully");
      } else {
        toast.error(result.error || "Failed to update order status");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentStatus}
        onValueChange={handleStatusChange}
        disabled={disabled || isPending || isTerminalStatus}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue>{statusLabels[currentStatus]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={currentStatus} disabled>
            {statusLabels[currentStatus]} (current)
          </SelectItem>
          {availableOptions.map(option => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
              {option.disabled && " (payment required)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Spinner />}
    </div>
  );
}
