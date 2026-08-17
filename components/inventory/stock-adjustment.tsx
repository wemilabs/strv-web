"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Package, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { updateStock } from "@/server/inventory";

const schema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  changeType: z.enum(["adjustment", "restock", "sale", "return", "damaged"]),
  reason: z.string().optional(),
  operation: z.enum(["add", "subtract"]),
});

type StockAdjustmentProps = {
  product: {
    id: string;
    name: string;
    currentStock: number;
  };
  organizationId: string;
};

export function StockAdjustment({
  product,
  organizationId,
}: StockAdjustmentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      quantity: 1,
      changeType: "adjustment",
      reason: "",
      operation: "add",
    },
  });

  const operation = form.watch("operation");

  function onSubmit(values: z.infer<typeof schema>) {
    startTransition(async () => {
      try {
        const quantityChange =
          values.operation === "add" ? values.quantity : -values.quantity;

        const result = await updateStock({
          productId: product.id,
          organizationId,
          quantityChange,
          changeType: values.changeType,
          reason: values.reason,
          revalidateTargetPath: "/point-of-sales/inventory",
        });

        if (!result.ok) {
          toast.error("Failed", {
            description:
              typeof result.error === "string"
                ? result.error
                : "Failed to update stock",
          });
          return;
        }

        form.reset();

        const statusMessage = result.statusChanged
          ? ` Status changed to ${result.newStatus?.replace("_", " ")}.`
          : "";

        toast.success("Stock Updated", {
          description: `Stock updated from ${result.previousStock} to ${result.newStock}.${statusMessage}`,
        });
        setDialogOpen(false);
      } catch (error: unknown) {
        const e = error as Error;
        console.error(e);
        toast.error("Error", {
          description: e.message || "Failed to update stock",
        });
      }
    });
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 justify-start">
          <Package className="size-4" />
          <span>Adjust Stock</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock - {product.name}</DialogTitle>
          <DialogDescription>
            Current stock:{" "}
            <span className="font-mono font-medium">
              {product.currentStock}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={field.value === "add" ? "default" : "outline"}
                      onClick={() => field.onChange("add")}
                      className="w-full"
                    >
                      <Plus className="size-4" />
                      Add Stock
                    </Button>
                    <Button
                      type="button"
                      variant={
                        field.value === "subtract" ? "default" : "outline"
                      }
                      onClick={() => field.onChange("subtract")}
                      className="w-full"
                    >
                      <Minus className="size-4" />
                      Remove Stock
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      {...field}
                      onChange={e => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    New stock will be:{" "}
                    <span className="font-mono font-medium">
                      {operation === "add"
                        ? product.currentStock + (field.value || 0)
                        : Math.max(
                            0,
                            product.currentStock - (field.value || 0),
                          )}
                    </span>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="changeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Change Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select change type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-100">
                      <SelectItem value="adjustment">
                        Manual Adjustment
                      </SelectItem>
                      <SelectItem value="restock">Restock</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="return">Customer Return</SelectItem>
                      <SelectItem value="damaged">Damaged/Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason{" "}
                    <span className="text-xs text-muted-foreground font-mono tracking-tighter">
                      (Optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a note about this stock change..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Updating...
                  </span>
                ) : (
                  "Update Stock"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
