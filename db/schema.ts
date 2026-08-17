import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  lastLoginMethod: text("last_login_method"),
  role: text("role").$defaultFn(() => "user"),
  banned: boolean("banned").$defaultFn(() => false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  followersCount: integer("followers_count").default(0).notNull(),
  followingCount: integer("following_count").default(0).notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  impersonatedBy: text("impersonated_by"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id").references(
    () => organization.id,
    { onDelete: "set null" },
  ),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const role = pgEnum("role", ["member", "admin", "owner"]);

export const productStatus = pgEnum("status", [
  "draft",
  "in_stock",
  "out_of_stock",
  "archived",
]);

export const orderStatus = pgEnum("order_status", [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
]);

export const feedbackType = pgEnum("feedback_type", [
  "bug",
  "feature",
  "improvement",
  "general",
]);

export const feedbackStatus = pgEnum("feedback_status", [
  "pending",
  "reviewing",
  "completed",
  "rejected",
]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "cancelled",
  "expired",
  "trial",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "successful",
  "failed",
  "expired",
]);

export const paymentKind = pgEnum("payment_kind", ["CASHIN", "CASHOUT"]);

export const mobilePlatform = pgEnum("mobile_platform", ["ios", "android"]);

export const notificationType = pgEnum("notification_type", [
  "renewal_reminder_7d",
  "renewal_reminder_3d",
  "renewal_reminder_1d",
  "subscription_expired",
  "subscription_activated",
  "payment_successful",
  "payment_failed",
  "general",
  "new_follower",
]);

export const adminActionType = pgEnum("admin_action_type", [
  "CREATE_USER",
  "UPDATE_USER",
  "DELETE_USER",
  "BAN_USER",
  "UNBAN_USER",
  "DELETE_EMAIL",
  "UPDATE_FEEDBACK",
  "DELETE_FEEDBACK",
  "VIEW_METRICS",
]);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    adminId: text("admin_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: adminActionType("action").notNull(),
    targetId: text("target_id"),
    targetType: text("target_type"),
    metadata: text("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("admin_audit_log_admin_idx").on(t.adminId),
    index("admin_audit_log_action_idx").on(t.action),
    index("admin_audit_log_created_idx").on(t.createdAt),
  ],
);

export const mobilePushToken = pgTable(
  "mobile_push_token",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expoPushToken: text("expo_push_token").notNull(),
    platform: mobilePlatform("platform").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("mobile_push_token_user_idx").on(t.userId),
    unique("mobile_push_token_unique").on(t.expoPushToken),
  ],
);

export const adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  admin: one(user, {
    fields: [adminAuditLog.adminId],
    references: [user.id],
  }),
}));

export const emailStatus = pgEnum("email_status", [
  "received",
  "processed",
  "failed",
]);

export const orderNotificationType = pgEnum("order_notification_type", [
  "new",
  "status_update",
]);

export const productCategory = pgEnum("product_category", [
  "health-wellness",
  "food-groceries",
  "clothing",
  "real-estate",
  "footwear",
  "beauty-personal-care",
  "jewelry-accessories",
  "electronics",
  "appliances",
  "furniture",
  "books-media",
  "automotive",
  "toys-games",
  "others",
]);

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").unique().notNull(),
  slug: text("slug").unique().notNull(),
  logo: text("logo"),
  createdAt: timestamp("created_at").notNull(),
  metadata: text("metadata"),
});

export const unitFormat = pgTable("unit_format", {
  id: text("id")
    .$defaultFn(() => randomUUID())
    .primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const subscription = pgTable(
  "subscription",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planName: text("plan_name").notNull(),
    status: subscriptionStatus("status").default("trial").notNull(),
    startDate: timestamp("start_date")
      .$defaultFn(() => new Date())
      .notNull(),
    endDate: timestamp("end_date"),
    trialEndsAt: timestamp("trial_ends_at"),
    cancelledAt: timestamp("cancelled_at"),
    orderLimit: integer("order_limit"),
    maxOrgs: integer("max_orgs"),
    maxProductsPerOrg: integer("max_products_per_org"),
    ordersUsedThisMonth: integer("orders_used_this_month").default(0).notNull(),
    billingPeriod: text("billing_period").default("monthly"),
    phoneNumber: text("phone_number"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    lastPaymentId: text("last_payment_id"),
    renewalReminderSentAt: timestamp("renewal_reminder_sent_at"),
    finalReminderSentAt: timestamp("final_reminder_sent_at"),
    scheduledPlanName: text("scheduled_plan_name"),
    scheduledChangeDate: timestamp("scheduled_change_date"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("subscription_user_idx").on(t.userId),
    index("subscription_status_idx").on(t.status),
  ],
);

export const orderUsageTracking = pgTable(
  "order_usage_tracking",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    monthYear: text("month_year").notNull(),
    orderCount: integer("order_count").default(0).notNull(),
    limit: integer("limit").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("order_usage_org_idx").on(t.organizationId),
    index("order_usage_month_idx").on(t.monthYear),
    unique("order_usage_org_month").on(t.organizationId, t.monthYear),
  ],
);

export const payment = pgTable(
  "payment",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id"),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    // Paypack fields
    kind: paymentKind("kind").default("CASHIN").notNull(),
    paypackRef: text("paypack_ref").unique(),
    phoneNumber: text("phone_number").notNull(),
    amount: text("amount").notNull(),
    baseAmount: text("base_amount"),
    paypackFee: text("paypack_fee"),
    platformFee: text("platform_fee"),
    currency: text("currency").default("RWF").notNull(),
    provider: text("provider"),
    // Payment details
    status: paymentStatus("status").default("pending").notNull(),
    planName: text("plan_name"),
    billingPeriod: text("billing_period").default("monthly"),
    isRenewal: boolean("is_renewal").default(false).notNull(),
    orderId: text("order_id"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("payment_user_idx").on(t.userId),
    index("payment_status_idx").on(t.status),
    index("payment_ref_idx").on(t.paypackRef),
  ],
);

export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("push_sub_user_idx").on(t.userId),
    unique("push_sub_endpoint").on(t.endpoint),
  ],
);

export const notification = pgTable(
  "notification",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    read: boolean("read").default(false).notNull(),
    sentViaPush: boolean("sent_via_push").default(false),
    actionUrl: text("action_url"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("notification_user_idx").on(t.userId),
    index("notification_read_idx").on(t.read),
  ],
);

export const orderNotification = pgTable(
  "order_notification",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    orderNumber: integer("order_number").notNull(),
    type: orderNotificationType("type").notNull(),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    total: text("total"),
    itemCount: integer("item_count"),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("order_notification_org_idx").on(t.organizationId),
    index("order_notification_order_idx").on(t.orderId),
    index("order_notification_read_idx").on(t.read),
  ],
);

export const userRelations = relations(user, ({ one, many }) => ({
  subscription: one(subscription, {
    fields: [user.id],
    references: [subscription.userId],
  }),
  payments: many(payment),
  pushSubscriptions: many(pushSubscription),
  mobilePushTokens: many(mobilePushToken),
  notifications: many(notification),
  followingOrganizations: many(userFollowOrganization),
  followers: many(userFollowUser, { relationName: "following" }),
  following: many(userFollowUser, { relationName: "follower" }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  products: many(product),
  orders: many(order),
  orderUsageTracking: many(orderUsageTracking),
  orderNotifications: many(orderNotification),
  receivedEmails: many(receivedEmail),
  followers: many(userFollowOrganization),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
}));

export const orderUsageTrackingRelations = relations(
  orderUsageTracking,
  ({ one }) => ({
    organization: one(organization, {
      fields: [orderUsageTracking.organizationId],
      references: [organization.id],
    }),
  }),
);

export const paymentRelations = relations(payment, ({ one }) => ({
  user: one(user, {
    fields: [payment.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [payment.organizationId],
    references: [organization.id],
  }),
  order: one(order, {
    fields: [payment.orderId],
    references: [order.id],
  }),
}));

export const pushSubscriptionRelations = relations(
  pushSubscription,
  ({ one }) => ({
    user: one(user, {
      fields: [pushSubscription.userId],
      references: [user.id],
    }),
  }),
);

export const mobilePushTokenRelations = relations(
  mobilePushToken,
  ({ one }) => ({
    user: one(user, {
      fields: [mobilePushToken.userId],
      references: [user.id],
    }),
  }),
);

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}));

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: role("role").default("member").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));

export const product = pgTable(
  "product",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    likesCount: integer("likes_count").default(0),
    status: productStatus("status").default("draft").notNull(),
    category: productCategory("category").notNull().default("others"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    unitFormatId: text("unit_format_id").references(() => unitFormat.id),
    inventoryEnabled: boolean("inventory_enabled").default(false).notNull(),
    currentStock: integer("current_stock").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
    calories: integer("calories"),
    imageUrls: text("image_urls").array(),
    videoUrl: text("video_url"),
    brand: text("brand"),
    specifications: text("specifications"),
    isLandlord: boolean("is_landlord").default(false).notNull(),
    visitFees: decimal("visit_fees", { precision: 10, scale: 2 }).default(
      "0.00",
    ),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  t => [
    index("product_slug_idx").on(t.slug),
    index("product_org_idx").on(t.organizationId),
  ],
);

export const tag = pgTable(
  "tag",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  t => [index("tag_slug_idx").on(t.slug)],
);

export const productTag = pgTable(
  "product_tag",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, {
        onDelete: "cascade",
      }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  t => [
    index("product_tag_product_idx").on(t.productId),
    index("product_tag_tag_idx").on(t.tagId),
    unique("product_tag_unique").on(t.productId, t.tagId),
  ],
);

export const productLike = pgTable(
  "product_like",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("product_like_product_idx").on(t.productId),
    index("product_like_user_idx").on(t.userId),
    unique("product_like_unique").on(t.productId, t.userId),
  ],
);

export const productLikeRelations = relations(productLike, ({ one }) => ({
  product: one(product, {
    fields: [productLike.productId],
    references: [product.id],
  }),
  user: one(user, {
    fields: [productLike.userId],
    references: [user.id],
  }),
}));

export const userFollowOrganization = pgTable(
  "user_follow_organization",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("user_follow_org_user_idx").on(t.userId),
    index("user_follow_org_org_idx").on(t.organizationId),
    unique("user_follow_org_unique").on(t.userId, t.organizationId),
  ],
);

export const userFollowOrganizationRelations = relations(
  userFollowOrganization,
  ({ one }) => ({
    user: one(user, {
      fields: [userFollowOrganization.userId],
      references: [user.id],
    }),
    organization: one(organization, {
      fields: [userFollowOrganization.organizationId],
      references: [organization.id],
    }),
  }),
);

export const userFollowUser = pgTable(
  "user_follow_user",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("user_follow_user_follower_idx").on(t.followerId),
    index("user_follow_user_following_idx").on(t.followingId),
    unique("user_follow_user_unique").on(t.followerId, t.followingId),
  ],
);

export const userFollowUserRelations = relations(userFollowUser, ({ one }) => ({
  follower: one(user, {
    fields: [userFollowUser.followerId],
    references: [user.id],
    relationName: "follower",
  }),
  following: one(user, {
    fields: [userFollowUser.followingId],
    references: [user.id],
    relationName: "following",
  }),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  organization: one(organization, {
    fields: [product.organizationId],
    references: [organization.id],
  }),
  unitFormat: one(unitFormat, {
    fields: [product.unitFormatId],
    references: [unitFormat.id],
  }),
  productTags: many(productTag),
  orderItems: many(orderItem),
  productLikes: many(productLike),
  inventoryHistory: many(inventoryHistory),
}));

export const order = pgTable(
  "order",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    orderNumber: integer("order_number").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    deliveryLocation: text("delivery_location"),
    notes: text("notes"),
    status: orderStatus("status").default("pending").notNull(),
    totalPrice: text("total_price").notNull(),
    isPaid: boolean("is_paid").default(false).notNull(),
    paidAt: timestamp("paid_at"),
    confirmedAt: timestamp("confirmed_at"),
    confirmedBy: text("confirmed_by").references(() => user.id),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("order_user_idx").on(t.userId),
    index("order_org_idx").on(t.organizationId),
    index("order_status_idx").on(t.status),
    index("order_number_idx").on(t.orderNumber),
    unique("order_number_per_org").on(t.organizationId, t.orderNumber),
  ],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    priceAtOrder: text("price_at_order").notNull(),
    subtotal: text("subtotal").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("order_item_order_idx").on(t.orderId),
    index("order_item_product_idx").on(t.productId),
  ],
);

export const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, {
    fields: [order.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [order.organizationId],
    references: [organization.id],
  }),
  orderItems: many(orderItem),
  orderNotification: one(orderNotification),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
  }),
  product: one(product, {
    fields: [orderItem.productId],
    references: [product.id],
  }),
}));

export const tagRelations = relations(tag, ({ many }) => ({
  productTags: many(productTag),
}));

export const productTagRelations = relations(productTag, ({ one }) => ({
  product: one(product, {
    fields: [productTag.productId],
    references: [product.id],
  }),
  tag: one(tag, {
    fields: [productTag.tagId],
    references: [tag.id],
  }),
}));

export const unitFormatRelations = relations(unitFormat, ({ many }) => ({
  products: many(product),
}));

export const inventoryHistory = pgTable(
  "inventory_history",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    changeType: text("change_type").notNull(),
    quantityChange: integer("quantity_change").notNull(),
    previousStock: integer("previous_stock").notNull(),
    newStock: integer("new_stock").notNull(),
    reason: text("reason"),
    orderId: text("order_id").references(() => order.id),
    userId: text("user_id").references(() => user.id),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("inventory_history_product_idx").on(t.productId),
    index("inventory_history_org_idx").on(t.organizationId),
    index("inventory_history_order_idx").on(t.orderId),
  ],
);

export const inventoryHistoryRelations = relations(
  inventoryHistory,
  ({ one }) => ({
    product: one(product, {
      fields: [inventoryHistory.productId],
      references: [product.id],
    }),
    organization: one(organization, {
      fields: [inventoryHistory.organizationId],
      references: [organization.id],
    }),
    order: one(order, {
      fields: [inventoryHistory.orderId],
      references: [order.id],
    }),
    user: one(user, {
      fields: [inventoryHistory.userId],
      references: [user.id],
    }),
  }),
);

export const feedback = pgTable(
  "feedback",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: feedbackType("type").notNull(),
    status: feedbackStatus("status").default("pending").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    email: text("email"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("feedback_user_idx").on(t.userId),
    index("feedback_type_idx").on(t.type),
    index("feedback_status_idx").on(t.status),
  ],
);

export const feedbackRelations = relations(feedback, ({ one, many }) => ({
  user: one(user, {
    fields: [feedback.userId],
    references: [user.id],
  }),
  history: many(feedbackHistory),
}));

export const feedbackHistory = pgTable(
  "feedback_history",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    feedbackId: text("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    previousStatus: feedbackStatus("previous_status").notNull(),
    newStatus: feedbackStatus("new_status").notNull(),
    changedBy: text("changed_by")
      .notNull()
      .references(() => user.id),
    changedAt: timestamp("changed_at")
      .$defaultFn(() => new Date())
      .notNull(),
    note: text("note"),
  },
  t => [
    index("feedback_history_feedback_idx").on(t.feedbackId),
    index("feedback_history_changed_by_idx").on(t.changedBy),
  ],
);

export const feedbackHistoryRelations = relations(
  feedbackHistory,
  ({ one }) => ({
    feedback: one(feedback, {
      fields: [feedbackHistory.feedbackId],
      references: [feedback.id],
    }),
    changedByUser: one(user, {
      fields: [feedbackHistory.changedBy],
      references: [user.id],
    }),
  }),
);

export const receivedEmail = pgTable(
  "received_email",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    emailId: text("email_id").notNull().unique(),
    from: text("from").notNull(),
    to: text("to").array().notNull(),
    cc: text("cc").array(),
    bcc: text("bcc").array(),
    subject: text("subject"),
    htmlBody: text("html_body"),
    textBody: text("text_body"),
    messageId: text("message_id"),
    status: emailStatus("status").default("received").notNull(),
    processedAt: timestamp("processed_at"),
    error: text("error"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("received_email_status_idx").on(t.status),
    index("received_email_created_idx").on(t.createdAt),
    unique("received_email_email_id").on(t.emailId),
  ],
);

export const emailAttachment = pgTable(
  "email_attachment",
  {
    id: text("id")
      .$defaultFn(() => randomUUID())
      .primaryKey(),
    emailId: text("email_id")
      .notNull()
      .references(() => receivedEmail.emailId, { onDelete: "cascade" }),
    attachmentId: text("attachment_id").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size"),
    contentDisposition: text("content_disposition"),
    contentId: text("content_id"),
    downloadUrl: text("download_url"),
    expiresAt: timestamp("expires_at"),
    fileKey: text("file_key"),
    uploadedAt: timestamp("uploaded_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  t => [
    index("email_attachment_email_idx").on(t.emailId),
    unique("email_attachment_attachment_id").on(t.attachmentId),
  ],
);

export const receivedEmailRelations = relations(receivedEmail, ({ many }) => ({
  attachments: many(emailAttachment),
}));

export const emailAttachmentRelations = relations(
  emailAttachment,
  ({ one }) => ({
    email: one(receivedEmail, {
      fields: [emailAttachment.emailId],
      references: [receivedEmail.emailId],
    }),
  }),
);

export type Organization = typeof organization.$inferSelect;
export type Role = (typeof role.enumValues)[number];
export type Member = typeof member.$inferSelect & {
  user: typeof user.$inferSelect;
};
export type User = typeof user.$inferSelect;
export type Product = typeof product.$inferSelect;
export type ProductCategory = (typeof productCategory.enumValues)[number];
export type ProductLike = typeof productLike.$inferSelect;
export type Tag = typeof tag.$inferSelect;
export type ProductStatus = (typeof productStatus.enumValues)[number];
export type Order = typeof order.$inferSelect;
export type OrderItem = typeof orderItem.$inferSelect;
export type OrderNotification = typeof orderNotification.$inferSelect;
export type OrderNotificationType =
  (typeof orderNotificationType.enumValues)[number];
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type Feedback = typeof feedback.$inferSelect;
export type FeedbackType = (typeof feedbackType.enumValues)[number];
export type FeedbackStatus = (typeof feedbackStatus.enumValues)[number];
export type FeedbackHistory = typeof feedbackHistory.$inferSelect;
export type Subscription = typeof subscription.$inferSelect;
export type SubscriptionStatus = (typeof subscriptionStatus.enumValues)[number];
export type OrderUsageTracking = typeof orderUsageTracking.$inferSelect;
export type UnitFormat = typeof unitFormat.$inferSelect;
export type InventoryHistory = typeof inventoryHistory.$inferSelect;
export type Payment = typeof payment.$inferSelect;
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];
export type PushSubscription = typeof pushSubscription.$inferSelect;
export type Notification = typeof notification.$inferSelect;
export type NotificationType = (typeof notificationType.enumValues)[number];
export type ReceivedEmail = typeof receivedEmail.$inferSelect;
export type EmailStatus = (typeof emailStatus.enumValues)[number];
export type EmailAttachment = typeof emailAttachment.$inferSelect;
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type AdminActionType = (typeof adminActionType.enumValues)[number];
export type UserFollowOrganization = typeof userFollowOrganization.$inferSelect;
export type UserFollowUser = typeof userFollowUser.$inferSelect;

export const schema = {
  user,
  session,
  account,
  verification,
  organization,
  member,
  invitation,
  subscription,
  orderUsageTracking,
  unitFormat,
  product,
  productLike,
  tag,
  productTag,
  order,
  orderItem,
  orderNotification,
  inventoryHistory,
  feedback,
  payment,
  pushSubscription,
  notification,
  receivedEmail,
  emailAttachment,
  adminAuditLog,
  userRelations,
  organizationRelations,
  memberRelations,
  invitationRelations,
  subscriptionRelations,
  orderUsageTrackingRelations,
  unitFormatRelations,
  productRelations,
  productLikeRelations,
  userFollowOrganization,
  userFollowOrganizationRelations,
  userFollowUser,
  userFollowUserRelations,
  tagRelations,
  productTagRelations,
  orderRelations,
  orderItemRelations,
  inventoryHistoryRelations,
  feedbackRelations,
  feedbackHistory,
  feedbackHistoryRelations,
  paymentRelations,
  pushSubscriptionRelations,
  notificationRelations,
  receivedEmailRelations,
  emailAttachmentRelations,
  adminAuditLogRelations,
};
