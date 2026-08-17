"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/drizzle";
import {
  inventoryHistory,
  member,
  order,
  orderItem,
  orderUsageTracking,
  organization,
  product,
  productLike,
  productTag,
} from "@/db/schema";

export async function resetAllData(
  _prevState: { success: boolean; error: string | null },
  formData: FormData,
) {
  const userId = formData.get("userId") as string;

  if (!userId) {
    return {
      success: false,
      error: "User ID is required",
    };
  }

  try {
    const userOrgs = await db.query.member.findMany({
      where: eq(member.userId, userId),
      with: {
        organization: true,
      },
    });

    // Delete all data for each organization
    for (const userOrg of userOrgs) {
      const orgId = userOrg.organization.id;

      // Get all order and product IDs for bulk deletion
      const orders = await db.query.order.findMany({
        where: eq(order.organizationId, orgId),
        columns: { id: true },
      });
      const orderIds = orders.map(o => o.id);

      const products = await db.query.product.findMany({
        where: eq(product.organizationId, orgId),
        columns: { id: true },
      });
      const productIds = products.map(p => p.id);

      // Delete order items
      if (orderIds.length > 0) {
        await db.delete(orderItem).where(inArray(orderItem.orderId, orderIds));
      }

      // Delete orders
      await db.delete(order).where(eq(order.organizationId, orgId));

      // Delete product-related data
      if (productIds.length > 0) {
        await db
          .delete(productTag)
          .where(inArray(productTag.productId, productIds));
        await db
          .delete(productLike)
          .where(inArray(productLike.productId, productIds));
      }

      // Delete inventory history
      await db
        .delete(inventoryHistory)
        .where(eq(inventoryHistory.organizationId, orgId));

      // Delete products
      await db.delete(product).where(eq(product.organizationId, orgId));

      // Delete order usage tracking
      await db
        .delete(orderUsageTracking)
        .where(eq(orderUsageTracking.organizationId, orgId));

      // Reset organization metadata (keep basic info)
      await db
        .update(organization)
        .set({
          metadata: null,
          logo: null,
        })
        .where(eq(organization.id, orgId));
    }

    revalidatePath("/settings");
    revalidatePath("/stores");
    revalidatePath("/point-of-sales/analytics");
    revalidatePath("/point-of-sales/orders");

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error("Failed to reset all data:", error);
    return {
      success: false,
      error: "Failed to reset data. Please try again.",
    };
  }
}
