"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import { orderItem, order as orderTable, user } from "@/db/schema";
import {
  ORDER_STATUS_VALUES,
  statusLabels,
  validTransitions,
} from "@/lib/constants";
import { decrypt, encrypt } from "@/lib/encryption";
import { realtime } from "@/lib/realtime";
import {
  getProductsStock,
  updateStock,
  updateStockInternal,
} from "./inventory";
import { createOrderNotification } from "./notifications";
import { createNotification } from "./push-notifications";
import { checkOrderLimit } from "./subscription";

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(1),
  notes: z.string().optional(),
});

const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
  deliveryLocation: z.string().min(1).optional(),
});

type CreateOrderInput = z.infer<typeof orderSchema> & {
  userId: string;
  userEmail: string;
  userName: string;
};

const getMobileOrderUrl = (orderId: string) => `/my-orders/${orderId}`;

export async function createOrderForUser(input: CreateOrderInput) {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: z.treeifyError(parsed.error) };

  const { items, notes, deliveryLocation } = parsed.data;

  try {
    const productIds = items.map(item => item.productId);
    const products = await db.query.product.findMany({
      where: (product, { inArray }) => inArray(product.id, productIds),
      with: {
        organization: true,
      },
    });

    if (products.length !== items.length)
      return { ok: false, error: "One or more products not found" };

    const organizationIds = [...new Set(products.map(p => p.organizationId))];
    if (organizationIds.length > 1)
      return {
        ok: false,
        error: "All products must belong to the same organization",
      };

    const organizationId = organizationIds[0];

    const orgOwner = await db.query.member.findFirst({
      where: (member, { eq }) => eq(member.organizationId, organizationId),
      with: {
        user: true,
      },
    });

    if (!orgOwner) return { ok: false, error: "Organization owner not found" };

    const orderLimit = await checkOrderLimit(organizationId);
    if (!orderLimit.canCreate)
      return {
        ok: false,
        error: `Merchant has reached their monthly order limit of ${orderLimit.maxOrders}. Please try again next month or contact the merchant.`,
      };

    const stockCheck = await getProductsStock({
      productIds,
      organizationId,
    });

    if (!stockCheck.ok)
      return { ok: false, error: "Failed to check product availability" };

    const stockWarnings: string[] = [];
    for (const item of items) {
      const productStock = stockCheck.stocks.find(s => s.id === item.productId);
      if (productStock?.inventoryEnabled) {
        const availableStock = productStock.currentStock || 0;
        if (item.quantity > availableStock)
          stockWarnings.push(
            `Only ${availableStock} units available for ${
              products.find(p => p.id === item.productId)?.name
            }, but ${
              item.quantity
            } requested. Order will be confirmed when stock is available.`,
          );
      }
    }

    let totalPrice = 0;
    const orderItems = items.map(item => {
      const productData = products.find(p => p.id === item.productId);
      if (!productData) throw new Error("Product not found");

      let priceAtOrder = productData.price;
      let subtotal = 0;

      if (productData.category === "real-estate") {
        priceAtOrder = productData.price;
        subtotal = 0;
      } else subtotal = Number(priceAtOrder) * item.quantity;

      if (productData.category !== "real-estate") totalPrice += subtotal;
      else if (!productData.isLandlord)
        totalPrice += Number(productData.visitFees || "0") * item.quantity;

      const displaySubtotal =
        productData.category === "real-estate"
          ? Number(priceAtOrder) * item.quantity
          : subtotal;

      return {
        productId: item.productId,
        productName: productData.name,
        quantity: item.quantity,
        priceAtOrder,
        subtotal: displaySubtotal.toFixed(2),
        notes: item.notes,
        productData: {
          category: productData.category,
          isLandlord: productData.isLandlord,
          visitFees: productData.visitFees,
        },
      };
    });

    const maxOrderResult = await db
      .select({
        maxNum: sql<number>`COALESCE(MAX(${orderTable.orderNumber}), 0)`,
      })
      .from(orderTable)
      .where(eq(orderTable.organizationId, organizationId));
    const nextOrderNumber = (maxOrderResult[0]?.maxNum || 0) + 1;

    const [newOrder] = await db
      .insert(orderTable)
      .values({
        orderNumber: nextOrderNumber,
        userId: input.userId,
        organizationId,
        deliveryLocation: deliveryLocation || null,
        notes: notes || null,
        totalPrice: encrypt(totalPrice.toFixed(2)),
      })
      .returning();

    await db.insert(orderItem).values(
      orderItems.map(item => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtOrder: encrypt(String(item.priceAtOrder)),
        subtotal: encrypt(item.subtotal),
      })),
    );

    const userData = await db.query.user.findFirst({
      where: eq(user.id, input.userId),
    });

    const { notificationId } = await createOrderNotification({
      organizationId,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      type: "new",
      customerName: userData?.name || input.userName,
      customerEmail: userData?.email || input.userEmail,
      total: totalPrice.toFixed(2),
      itemCount: items.length,
    });

    await realtime.channel(`org:${organizationId}`).emit("orders.new", {
      notificationId,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerName: userData?.name || input.userName,
      customerEmail: userData?.email || input.userEmail,
      total: totalPrice.toFixed(2),
      organizationId,
      itemCount: items.length,
      createdAt: newOrder.createdAt.toISOString(),
    });

    await createNotification({
      userId: input.userId,
      type: "general",
      title: "Order placed",
      message: `Your order #${newOrder.orderNumber} has been placed successfully.`,
      actionUrl: getMobileOrderUrl(newOrder.id),
      sendPush: true,
    });

    return {
      ok: true,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      totalPrice: totalPrice.toFixed(2),
      deliveryLocation: newOrder.deliveryLocation,
      stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Order placement failed:", { err });
    return { ok: false, error: err.message };
  }
}

export async function placeOrder(input: z.infer<typeof orderSchema>) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  const { session } = verified;

  return createOrderForUser({
    ...input,
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name,
  });
}

const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(ORDER_STATUS_VALUES),
});

export async function updateOrderStatus(
  input: z.infer<typeof updateOrderStatusSchema>,
) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  const { session } = verified;

  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { orderId, status } = parsed.data;

  try {
    const existingOrder = await db.query.order.findFirst({
      where: eq(orderTable.id, orderId),
      with: {
        user: true,
        organization: {
          with: {
            members: {
              where: (member, { eq }) => eq(member.userId, session.user.id),
            },
          },
        },
      },
    });

    if (!existingOrder) return { ok: false, error: "Order not found" };

    const member = existingOrder.organization.members[0];
    if (!member || (member.role !== "admin" && member.role !== "owner"))
      return { ok: false, error: "Unauthorized to update this order" };

    const oldStatus = existingOrder.status;

    const allowedNextStatuses = validTransitions[oldStatus] || [];

    if (status === oldStatus) {
      return { ok: false, error: "Order is already in this status" };
    }

    if (!allowedNextStatuses.includes(status)) {
      if (oldStatus === "delivered") {
        return {
          ok: false,
          error: "Cannot change status of a delivered order",
        };
      }
      if (oldStatus === "cancelled") {
        return {
          ok: false,
          error: "Cannot change status of a cancelled order",
        };
      }

      return {
        ok: false,
        error: `Invalid status transition. Order must be "${statusLabels[allowedNextStatuses[0] || oldStatus]}" before it can be "${statusLabels[status]}"`,
      };
    }

    if (status === "preparing" && !existingOrder.isPaid) {
      return {
        ok: false,
        error: "Order must be paid before it can start preparing",
      };
    }

    await db
      .update(orderTable)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, orderId));

    const actionUrl = getMobileOrderUrl(existingOrder.id);

    if (status !== oldStatus) {
      await createNotification({
        userId: existingOrder.userId,
        type: "general",
        title: "Order update",
        message: `Order #${existingOrder.orderNumber} ${
          statusLabels[status] === "confirmed" ||
          statusLabels[status] === "delivered" ||
          statusLabels[status] === "cancelled"
            ? "has been"
            : "is now"
        } ${statusLabels[status]}.`,
        actionUrl,
        sendPush: true,
      });
    }

    // Deduct stock when order is confirmed (if status changed to confirmed)
    if (status === "confirmed" && oldStatus !== "confirmed") {
      const orderItems = await db.query.orderItem.findMany({
        where: eq(orderItem.orderId, orderId),
        with: {
          product: {
            columns: {
              id: true,
              inventoryEnabled: true,
            },
          },
        },
      });

      // Validate stock availability before confirming
      const productIds = orderItems.map(item => item.productId);
      const stockCheck = await getProductsStock({
        productIds,
        organizationId: existingOrder.organizationId,
      });

      if (stockCheck.ok) {
        // Check each item against current stock
        for (const item of orderItems) {
          const productStock = stockCheck.stocks.find(
            s => s.id === item.productId,
          );
          if (productStock?.inventoryEnabled) {
            const availableStock = productStock.currentStock || 0;
            if (item.quantity > availableStock) {
              // Rollback order status if insufficient stock
              await db
                .update(orderTable)
                .set({
                  status: oldStatus,
                  updatedAt: new Date(),
                })
                .where(eq(orderTable.id, orderId));

              return {
                ok: false,
                error: `Insufficient stock. Only ${availableStock} units available, but ${item.quantity} requested.`,
              };
            }
          }
        }
      }

      // Deduct stock for each item with inventory tracking
      for (const item of orderItems) {
        if (item.product.inventoryEnabled) {
          const stockUpdate = await updateStock({
            productId: item.productId,
            organizationId: existingOrder.organizationId,
            quantityChange: -item.quantity,
            changeType: "sale",
            reason: `Order ${orderId} confirmed`,
            revalidateTargetPath: "/point-of-sales/inventory",
          });

          if (!stockUpdate.ok) {
            // Rollback order status if stock deduction fails
            await db
              .update(orderTable)
              .set({
                status: oldStatus,
                updatedAt: new Date(),
              })
              .where(eq(orderTable.id, orderId));

            return {
              ok: false,
              error: `Failed to deduct stock: ${stockUpdate.error}`,
            };
          }
        }
      }

      // Emit real-time notification to customer when order is confirmed
      await realtime
        .channel(`user:${existingOrder.userId}`)
        .emit("orders.confirmed", {
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          storeName: existingOrder.organization.name,
          total: decrypt(existingOrder.totalPrice),
          itemCount: orderItems.length,
          confirmedAt: new Date().toISOString(),
        });
    }

    if (status === "preparing" && oldStatus !== "preparing") {
      await realtime
        .channel(`user:${existingOrder.userId}`)
        .emit("orders.preparing", {
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          storeName: existingOrder.organization.name,
          preparingAt: new Date().toISOString(),
        });
    }

    if (status === "ready" && oldStatus !== "ready") {
      await realtime
        .channel(`user:${existingOrder.userId}`)
        .emit("orders.ready", {
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          storeName: existingOrder.organization.name,
          readyAt: new Date().toISOString(),
        });
    }

    if (status === "delivered" && oldStatus !== "delivered") {
      await realtime
        .channel(`user:${existingOrder.userId}`)
        .emit("orders.delivered", {
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          storeName: existingOrder.organization.name,
          deliveredAt: new Date().toISOString(),
        });
    }

    if (status === "cancelled" && oldStatus !== "cancelled") {
      const stockDeductedStatuses = ["confirmed", "preparing", "ready"];
      if (stockDeductedStatuses.includes(oldStatus)) {
        const cancelOrderItems = await db.query.orderItem.findMany({
          where: eq(orderItem.orderId, orderId),
          with: {
            product: {
              columns: {
                id: true,
                inventoryEnabled: true,
              },
            },
          },
        });

        for (const item of cancelOrderItems) {
          if (item.product.inventoryEnabled) {
            const stockResult = await updateStockInternal({
              productId: item.productId,
              organizationId: existingOrder.organizationId,
              quantityChange: item.quantity,
              changeType: "return",
              reason: `Order ${orderId} cancelled`,
              revalidateTargetPath: "/point-of-sales/inventory",
              userId: session.user.id,
            });

            if (!stockResult.ok) {
              console.error(
                `Failed to restore stock for product ${item.productId}:`,
                stockResult.error,
              );
            }
          }
        }
      }

      await realtime
        .channel(`user:${existingOrder.userId}`)
        .emit("orders.cancelled", {
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          cancelledBy: "merchant",
          storeName: existingOrder.organization.name,
          customerName: existingOrder.user.name,
          organizationId: existingOrder.organizationId,
          userId: existingOrder.userId,
          cancelledAt: new Date().toISOString(),
        });
    }

    revalidatePath("/point-of-sales/orders");
    revalidatePath(`/point-of-sales/orders/${orderId}`);
    revalidatePath("/point-of-sales/inventory");

    return { ok: true };
  } catch (error) {
    console.error("Order status update error:", error);
    return { ok: false, error: "Failed to update order status" };
  }
}

export async function cancelOrderForUser(orderId: string, userId: string) {
  try {
    const existingOrder = await db.query.order.findFirst({
      where: eq(orderTable.id, orderId),
      with: {
        user: true,
        organization: true,
      },
    });

    if (!existingOrder) return { ok: false, error: "Order not found" };

    const isCustomer = existingOrder.userId === userId;
    let isMerchant = false;

    if (!isCustomer) {
      const organizationMember = await db.query.member.findFirst({
        where: (member, { and, eq }) =>
          and(
            eq(member.organizationId, existingOrder.organizationId),
            eq(member.userId, userId),
          ),
      });

      if (
        !organizationMember ||
        (organizationMember.role !== "admin" &&
          organizationMember.role !== "owner")
      )
        return { ok: false, error: "Unauthorized to cancel this order" };

      isMerchant = true;
    }

    if (existingOrder.status === "delivered")
      return { ok: false, error: "Cannot cancel a delivered order" };

    if (existingOrder.status === "cancelled")
      return { ok: false, error: "Order is already cancelled" };

    const orderItems = await db.query.orderItem.findMany({
      where: eq(orderItem.orderId, orderId),
      with: {
        product: {
          columns: {
            id: true,
            inventoryEnabled: true,
          },
        },
      },
    });

    const stockDeductedStatuses = ["confirmed", "preparing", "ready"];
    if (stockDeductedStatuses.includes(existingOrder.status)) {
      for (const item of orderItems) {
        if (item.product.inventoryEnabled) {
          const stockResult = await updateStockInternal({
            productId: item.productId,
            organizationId: existingOrder.organizationId,
            quantityChange: item.quantity,
            changeType: "return",
            reason: `Order ${orderId} cancelled`,
            revalidateTargetPath: "/point-of-sales/inventory",
            userId,
          });

          if (!stockResult.ok) {
            console.error(
              `Failed to restore stock for product ${item.productId}:`,
              stockResult.error,
            );
          }
        }
      }
    }

    const now = new Date();

    await db
      .update(orderTable)
      .set({
        status: "cancelled",
        updatedAt: now,
      })
      .where(eq(orderTable.id, orderId));

    const cancelledBy: "merchant" | "customer" = isMerchant
      ? "merchant"
      : "customer";
    const cancelData = {
      orderId: existingOrder.id,
      orderNumber: existingOrder.orderNumber,
      cancelledBy,
      storeName: existingOrder.organization.name,
      customerName: existingOrder.user.name,
      organizationId: existingOrder.organizationId,
      userId: existingOrder.userId,
      cancelledAt: now.toISOString(),
    };

    if (isMerchant) {
      await realtime
        .channel(`user:${existingOrder.userId}`)
        .emit("orders.cancelled", cancelData);

      await createNotification({
        userId: existingOrder.userId,
        type: "general",
        title: "Order cancelled",
        message: `Your order #${existingOrder.orderNumber} has been cancelled by the merchant.`,
        actionUrl: getMobileOrderUrl(existingOrder.id),
        sendPush: true,
      });
    } else {
      await realtime
        .channel(`org:${existingOrder.organizationId}`)
        .emit("orders.cancelled", cancelData);

      const orgMembers = await db.query.member.findMany({
        where: (member, { and, eq, or }) =>
          and(
            eq(member.organizationId, existingOrder.organizationId),
            or(eq(member.role, "admin"), eq(member.role, "owner")),
          ),
        columns: {
          userId: true,
        },
      });

      const actionUrl = `/point-of-sales/orders/${existingOrder.id}`;

      await Promise.allSettled(
        orgMembers.map(m =>
          createNotification({
            userId: m.userId,
            type: "general",
            title: "Order cancelled",
            message: `Order #${existingOrder.orderNumber} has been cancelled by the customer.`,
            actionUrl,
            sendPush: true,
          }),
        ),
      );
    }

    revalidatePath("/point-of-sales/orders");
    revalidatePath(`/point-of-sales/orders/${orderId}`);
    revalidatePath("/point-of-sales/inventory");

    return { ok: true };
  } catch (error) {
    console.error("Order cancellation error:", error);
    return { ok: false, error: "Failed to cancel order" };
  }
}

export async function cancelOrder(orderId: string) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  return cancelOrderForUser(orderId, verified.session.user.id);
}

const markOrderAsDeliveredSchema = z.object({
  orderId: z.string().min(1),
});

export async function markOrderAsDelivered(
  input: z.infer<typeof markOrderAsDeliveredSchema>,
) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  const { session } = verified;

  const parsed = markOrderAsDeliveredSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { orderId } = parsed.data;

  try {
    const existingOrder = await db.query.order.findFirst({
      where: (order, { eq }) => eq(order.id, orderId),
      with: {
        organization: true,
        user: true,
      },
    });

    if (!existingOrder) return { ok: false, error: "Order not found" };

    if (existingOrder.userId !== session.user.id)
      return {
        ok: false,
        error: "Only the customer can mark this as delivered",
      };

    if (existingOrder.status === "delivered")
      return { ok: false, error: "Order is already delivered" };

    if (existingOrder.status === "cancelled")
      return { ok: false, error: "Cannot mark a cancelled order as delivered" };

    await db
      .update(orderTable)
      .set({
        status: "delivered",
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, orderId));

    await realtime
      .channel(`org:${existingOrder.organizationId}`)
      .emit("orders.delivered", {
        orderId: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
        storeName: existingOrder.organization.name,
        customerName: existingOrder.user.name,
        deliveredAt: new Date().toISOString(),
      });

    const orgMembers = await db.query.member.findMany({
      where: (member, { and, eq, or }) =>
        and(
          eq(member.organizationId, existingOrder.organizationId),
          or(eq(member.role, "admin"), eq(member.role, "owner")),
        ),
      columns: {
        userId: true,
      },
    });

    const actionUrl = `/point-of-sales/orders/${existingOrder.id}`;

    await Promise.allSettled(
      orgMembers.map(m =>
        createNotification({
          userId: m.userId,
          type: "general",
          title: "Order delivered",
          message: `Order #${existingOrder.orderNumber} has been marked as delivered by the customer.`,
          actionUrl,
          sendPush: true,
        }),
      ),
    );

    revalidatePath("/point-of-sales/orders");
    revalidatePath(`/point-of-sales/orders/${orderId}`);

    return { ok: true };
  } catch (error) {
    console.error("Mark order as delivered error:", error);
    return { ok: false, error: "Failed to mark order as delivered" };
  }
}

export async function getOrganizationAnalyticsOverview(
  organizationId: string,
  days: number = 28,
) {
  const verified = await verifySession();
  if (!verified.success) return { ok: false, error: "Unauthorized" };

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (days - 1));

  // Get organization to determine timezone
  const organization = await db.query.organization.findFirst({
    where: (org, { eq }) => eq(org.id, organizationId),
    columns: {
      metadata: true,
    },
  });

  const orgTimezone = organization?.metadata
    ? typeof organization.metadata === "string"
      ? JSON.parse(organization.metadata).timezone
      : (organization.metadata as Record<string, unknown>).timezone
    : "Africa/Kigali";

  const orders = await db.query.order.findMany({
    where: (order, { and, eq, gte }) =>
      and(
        eq(order.organizationId, organizationId),
        gte(order.createdAt, startDate),
      ),
    columns: {
      id: true,
      createdAt: true,
      totalPrice: true,
    },
  });

  const byDay: Record<string, number> = {};
  const byWeek: Record<string, number> = {};
  const byHour: Record<string, number> = {};

  for (const o of orders) {
    const d = new Date(o.createdAt);

    // Use organization's timezone for day names
    const dayKey = d.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: orgTimezone,
    });
    byDay[dayKey] = (byDay[dayKey] || 0) + 1;

    // Week aggregation
    const weekOfMonth = Math.floor((d.getDate() - 1) / 7) + 1;
    const wKey = `Week ${weekOfMonth}`;
    const revenue = Number(decrypt(o.totalPrice) ?? 0);
    byWeek[wKey] = (byWeek[wKey] || 0) + revenue;

    // Hour aggregation for peak time analysis
    const hour = d.getHours();
    byHour[hour] = (byHour[hour] || 0) + 1;
  }

  const weekdayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const starterSeries = weekdayOrder.map(day => ({
    day,
    orders: byDay[day] || 0,
  }));

  const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const growthSeries = weekLabels.map(label => ({
    label,
    revenue: byWeek[label] || 0,
  }));

  // Find peak hour
  const peakHour = Object.entries(byHour).reduce(
    (a, b) => (byHour[a[0]] > byHour[b[0]] ? a : b),
    ["0", 0],
  );

  // Calculate basic metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(decrypt(order.totalPrice) ?? 0),
    0,
  );
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Pro analytics: Product performance (top products by revenue)
  const orderItems = await db.query.orderItem.findMany({
    where: (item, { eq, inArray }) => {
      const orderIds = orders.map(o => o.id);
      return orderIds.length > 0
        ? inArray(item.orderId, orderIds)
        : eq(item.orderId, ""); // No orders
    },
    with: {
      product: {
        columns: {
          name: true,
        },
      },
    },
  });

  const productRevenue: Record<string, number> = {};
  for (const item of orderItems) {
    const productName = item.product?.name || "Unknown";
    const revenue = Number(decrypt(item.subtotal) ?? 0);
    productRevenue[productName] = (productRevenue[productName] || 0) + revenue;
  }

  const topProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, revenue]) => ({ label, revenue }));

  return {
    starterSeries,
    growthSeries,
    proSeries: topProducts.length > 0 ? topProducts : growthSeries,
    metrics: {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      peakHour: parseInt(peakHour[0], 10),
      peakHourOrders: peakHour[1],
      timezone: orgTimezone,
    },
  };
}
