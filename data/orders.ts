import "server-only";
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { cache } from "react";

import { verifySession } from "@/data/user-session";
import { db } from "@/db/drizzle";
import { member, type OrderStatus, order } from "@/db/schema";
import { decrypt } from "@/lib/encryption";

function decryptOrderItems<
  T extends { priceAtOrder: string; subtotal: string },
>(items: T[]): T[] {
  return items.map(item => ({
    ...item,
    priceAtOrder: decrypt(item.priceAtOrder),
    subtotal: decrypt(item.subtotal),
  }));
}

function decryptOrder<T extends { totalPrice: string }>(ord: T): T {
  return {
    ...ord,
    totalPrice: decrypt(ord.totalPrice),
  };
}

async function calculateMerchantOrderNumberPerOrg(
  organizationId: string,
  orderCreatedAt: Date,
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(order)
    .where(
      and(
        eq(order.organizationId, organizationId),
        or(
          lt(order.createdAt, orderCreatedAt),
          and(eq(order.createdAt, orderCreatedAt)),
        ),
      ),
    );
  return result[0]?.count || 0;
}

async function calculateCustomerOrderNumberPerUserPerOrg(
  userId: string,
  organizationId: string,
  orderCreatedAt: Date,
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(order)
    .where(
      and(
        eq(order.userId, userId),
        eq(order.organizationId, organizationId),
        or(
          lt(order.createdAt, orderCreatedAt),
          and(eq(order.createdAt, orderCreatedAt)),
        ),
      ),
    );
  return result[0]?.count || 0;
}

export const getOrdersByOrganization = cache(async (organizationId: string) => {
  const verified = await verifySession();
  if (!verified.success)
    return { ok: false, error: "Unauthorized", orders: [] };

  const { session } = verified;

  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, organizationId),
      eq(member.userId, session.user.id),
    ),
  });

  if (!membership)
    return {
      ok: false,
      error: "Only organization members can view orders",
      orders: [],
    };

  const orders = await db.query.order.findMany({
    where: eq(order.organizationId, organizationId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      orderItems: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              imageUrls: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: [desc(order.createdAt)],
  });

  const ordersWithNumbers = await Promise.all(
    orders.map(async ord => {
      const merchantOrderNumber = await calculateMerchantOrderNumberPerOrg(
        organizationId,
        ord.createdAt,
      );
      return {
        ...decryptOrder(ord),
        orderItems: decryptOrderItems(ord.orderItems),
        merchantOrderNumber,
      };
    }),
  );

  return { ok: true, orders: ordersWithNumbers };
});

export const getOrderById = cache(async (orderId: string) => {
  const verified = await verifySession();
  if (!verified.success)
    return { ok: false as const, error: "Unauthorized", order: null };

  const { session } = verified;
  const orderData = await db.query.order.findFirst({
    where: eq(order.id, orderId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      organization: {
        columns: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
      },
      orderItems: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              imageUrls: true,
              price: true,
              description: true,
            },
          },
        },
      },
    },
  });

  if (!orderData)
    return { ok: false as const, error: "Order not found", order: null };

  const isCustomer = orderData.userId === session.user.id;

  if (!isCustomer) {
    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, orderData.organizationId),
        eq(member.userId, session.user.id),
      ),
    });

    if (!membership)
      return {
        ok: false as const,
        error:
          "You can only view your own orders or orders from your organization",
        order: null,
      };
  }

  const [merchantOrderNumber, customerOrderNumber] = await Promise.all([
    calculateMerchantOrderNumberPerOrg(
      orderData.organizationId,
      orderData.createdAt,
    ),
    calculateCustomerOrderNumberPerUserPerOrg(
      orderData.userId,
      orderData.organizationId,
      orderData.createdAt,
    ),
  ]);

  return {
    ok: true as const,
    order: {
      ...decryptOrder(orderData),
      orderItems: decryptOrderItems(orderData.orderItems),
      merchantOrderNumber,
      customerOrderNumber,
    },
  };
});

export const getOrdersByUser = cache(async (userId: string) => {
  const verified = await verifySession();
  if (!verified.success)
    return { ok: false, error: "Unauthorized", orders: [] };

  const { session } = verified;

  if (session.user.id !== userId)
    return {
      ok: false,
      error: "You can only view your own orders",
      orders: [],
    };

  const orders = await db.query.order.findMany({
    where: eq(order.userId, userId),
    with: {
      organization: {
        columns: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
      },
      orderItems: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              imageUrls: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: [desc(order.createdAt)],
  });

  const ordersWithNumbers = await Promise.all(
    orders.map(async ord => {
      const customerOrderNumber =
        await calculateCustomerOrderNumberPerUserPerOrg(
          userId,
          ord.organizationId,
          ord.createdAt,
        );
      return {
        ...decryptOrder(ord),
        orderItems: decryptOrderItems(ord.orderItems),
        customerOrderNumber,
      };
    }),
  );

  return { ok: true, orders: ordersWithNumbers };
});

export async function getOrdersByUserForMobile(userId: string) {
  const orders = await db.query.order.findMany({
    where: eq(order.userId, userId),
    with: {
      organization: {
        columns: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
      },
      orderItems: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              imageUrls: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: [desc(order.createdAt)],
  });

  return orders.map(ord => ({
    ...decryptOrder(ord),
    orderItems: decryptOrderItems(ord.orderItems),
  }));
}

export async function getOrderByIdForMobile(input: {
  orderId: string;
  userId: string;
}) {
  const orderData = await db.query.order.findFirst({
    where: eq(order.id, input.orderId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      organization: {
        columns: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
      },
      orderItems: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              imageUrls: true,
              price: true,
              description: true,
            },
          },
        },
      },
    },
  });

  if (!orderData) {
    return { ok: false as const, error: "Order not found", status: 404 };
  }

  const isCustomer = orderData.userId === input.userId;

  if (!isCustomer) {
    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, orderData.organizationId),
        eq(member.userId, input.userId),
      ),
    });

    if (!membership) {
      return {
        ok: false as const,
        error: "You can only view your own orders",
        status: 403,
      };
    }
  }

  return {
    ok: true as const,
    order: {
      ...decryptOrder(orderData),
      orderItems: decryptOrderItems(orderData.orderItems),
    },
  };
}

export const getOrdersByStatus = cache(
  async (organizationId: string, status: OrderStatus | OrderStatus[]) => {
    const verified = await verifySession();
    if (!verified.success)
      return { ok: false, error: "Unauthorized", orders: [] };

    const { session } = verified;

    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, organizationId),
        eq(member.userId, session.user.id),
      ),
    });

    if (!membership)
      return {
        ok: false,
        error: "Only organization members can view orders",
        orders: [],
      };

    const statuses = Array.isArray(status) ? status : [status];

    const orders = await db.query.order.findMany({
      where: and(
        eq(order.organizationId, organizationId),
        inArray(order.status, statuses),
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        orderItems: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                imageUrls: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: [desc(order.createdAt)],
    });

    const ordersWithNumbers = await Promise.all(
      orders.map(async ord => {
        const merchantOrderNumber = await calculateMerchantOrderNumberPerOrg(
          organizationId,
          ord.createdAt,
        );
        return {
          ...decryptOrder(ord),
          orderItems: decryptOrderItems(ord.orderItems),
          merchantOrderNumber,
        };
      }),
    );

    return { ok: true, orders: ordersWithNumbers };
  },
);

export const getOrderStats = cache(
  async (organizationId: string, userId: string) => {
    "use cache";
    cacheLife("minutes");

    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, organizationId),
        eq(member.userId, userId),
      ),
    });

    if (!membership)
      return {
        ok: false,
        error: "Only organization members can view order stats",
        stats: [],
      };

    const orders = await db.query.order.findMany({
      where: eq(order.organizationId, organizationId),
      columns: {
        status: true,
        totalPrice: true,
      },
    });

    const statsByStatus = orders.reduce(
      (acc, ord) => {
        const status = ord.status;
        if (!acc[status]) {
          acc[status] = { status, count: 0, totalRevenue: 0 };
        }
        acc[status].count += 1;
        acc[status].totalRevenue += Number(decrypt(ord.totalPrice) || 0);
        return acc;
      },
      {} as Record<
        string,
        { status: OrderStatus; count: number; totalRevenue: number }
      >,
    );

    return {
      ok: true,
      stats: Object.values(statsByStatus).map(s => ({
        status: s.status,
        count: s.count,
        totalRevenue: String(s.totalRevenue),
      })),
    };
  },
);

export const getRecentOrders = cache(
  async (organizationId: string, limit: number = 10) => {
    "use cache";
    cacheLife("seconds");

    const verified = await verifySession();
    if (!verified.success)
      return { ok: false, error: "Unauthorized", orders: [] };

    const { session } = verified;

    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, organizationId),
        eq(member.userId, session.user.id),
      ),
    });

    if (!membership)
      return {
        ok: false,
        error: "Only organization members can view orders",
        orders: [],
      };

    const orders = await db.query.order.findMany({
      where: eq(order.organizationId, organizationId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        orderItems: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [desc(order.createdAt)],
      limit,
    });

    const ordersWithNumbers = await Promise.all(
      orders.map(async ord => {
        const merchantOrderNumber = await calculateMerchantOrderNumberPerOrg(
          organizationId,
          ord.createdAt,
        );
        return {
          ...decryptOrder(ord),
          orderItems: decryptOrderItems(ord.orderItems),
          merchantOrderNumber,
        };
      }),
    );

    return { ok: true, orders: ordersWithNumbers };
  },
);
