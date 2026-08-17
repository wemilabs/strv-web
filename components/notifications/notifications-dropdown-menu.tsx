"use client";

import {
  Banknote,
  Bell,
  CheckCircle,
  ChefHat,
  Clock,
  Package,
  PackageCheck,
  Truck,
  UserPlus,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRealtime } from "@/hooks/use-realtime";
import { useActiveOrganization, useSession } from "@/lib/auth-client";
import { formatPriceInRWF, formatRelativeTime } from "@/lib/utils";
import {
  getOrderNotifications,
  getUnreadOrderNotificationCount,
  markAllOrderNotificationsAsRead,
  markOrderNotificationAsRead,
} from "@/server/notifications";

type NotificationType =
  | "new"
  | "status_update"
  | "order_confirmed"
  | "order_preparing"
  | "order_ready"
  | "order_delivered"
  | "order_paid"
  | "order_cancelled"
  | "new_follower";

interface OrderNotification {
  id: string;
  organizationId: string | null;
  orderId: string;
  type: NotificationType;
  orderNumber: number;
  customerName: string | null;
  customerEmail: string | null;
  storeName: string | null;
  total: string | null;
  itemCount: number | null;
  createdAt: Date;
  read: boolean;
}

interface FollowerNotification {
  id: string;
  type: "new_follower";
  followerId: string;
  followerName: string;
  followerImage?: string;
  targetId: string;
  targetType: "user" | "organization";
  targetName: string;
  createdAt: Date;
  read: boolean;
}

type Notification = OrderNotification | FollowerNotification;

export function NotificationsDropdownMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: activeStore } = useActiveOrganization();

  const userId = session?.user?.id;

  // Sync with database on mount and when organization changes
  useEffect(() => {
    if (!activeStore?.id) return;

    const orgId = activeStore.id;
    let ignore = false;

    async function loadNotifications() {
      try {
        const [notificationsData, unreadData] = await Promise.all([
          getOrderNotifications(orgId, 50),
          getUnreadOrderNotificationCount(orgId),
        ]);

        if (!ignore) {
          setNotifications(
            notificationsData.notifications?.map(n => ({
              ...n,
              storeName: null,
            })) ?? [],
          );
          setUnreadCount(unreadData.count);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    }

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, [activeStore?.id]);

  // Mark notification as read when clicked
  const handleNotificationClick = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)),
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await markOrderNotificationAsRead(notificationId);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Failed to mark notification as read:", err.message);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!activeStore?.id) return;

    setNotifications([]);
    setUnreadCount(0);

    try {
      await markAllOrderNotificationsAsRead(activeStore.id);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Failed to mark all notifications as read:", err.message);
    }
  };

  // Listen for new orders, payments, deliveries, and cancellations (merchant)
  useRealtime({
    channels: activeStore ? [`org:${activeStore.id}`] : [],
    events: [
      "orders.new",
      "orders.paid",
      "orders.delivered",
      "orders.cancelled",
    ],
    onData: payload => {
      if (
        payload.event === "orders.new" &&
        payload.data.organizationId === activeStore?.id
      ) {
        const newNotification: OrderNotification = {
          id: payload.data.notificationId,
          organizationId: payload.data.organizationId,
          orderId: payload.data.orderId,
          type: "new",
          orderNumber: payload.data.orderNumber,
          customerName: payload.data.customerName,
          customerEmail: payload.data.customerEmail,
          storeName: null,
          total: payload.data.total,
          itemCount: payload.data.itemCount,
          createdAt: new Date(payload.data.createdAt),
          read: false,
        };

        setNotifications(prev => [newNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        toast.success("New order received!", {
          description: `Order #${payload.data.orderNumber} from ${payload.data.customerName}`,
          action: {
            label: "View Order",
            onClick: () => {
              router.push(`/point-of-sales/orders/${payload.data.orderId}`);
            },
          },
        });
      }

      if (
        payload.event === "orders.paid" &&
        payload.data.organizationId === activeStore?.id
      ) {
        const paidNotification: OrderNotification = {
          id: crypto.randomUUID(),
          organizationId: payload.data.organizationId,
          orderId: payload.data.orderId,
          type: "order_paid",
          orderNumber: payload.data.orderNumber,
          customerName: payload.data.customerName,
          customerEmail: null,
          storeName: null,
          total: payload.data.total,
          itemCount: null,
          createdAt: new Date(payload.data.paidAt),
          read: false,
        };

        setNotifications(prev => [paidNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        toast.success("Order Paid!", {
          description: `Order #${payload.data.orderNumber} from ${payload.data.customerName} has been paid`,
          action: {
            label: "View Order",
            onClick: () => {
              router.push(`/point-of-sales/orders/${payload.data.orderId}`);
            },
          },
        });
      }

      // Customer marked as delivered → notify merchant
      if (payload.event === "orders.delivered" && payload.data.customerName) {
        const deliveredNotification: OrderNotification = {
          id: crypto.randomUUID(),
          organizationId: activeStore?.id ?? null,
          orderId: payload.data.orderId,
          type: "order_delivered",
          orderNumber: payload.data.orderNumber,
          customerName: payload.data.customerName,
          customerEmail: null,
          storeName: null,
          total: null,
          itemCount: null,
          createdAt: new Date(payload.data.deliveredAt),
          read: false,
        };

        setNotifications(prev => [deliveredNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        toast.success("Order Delivered!", {
          description: `Order #${payload.data.orderNumber} was marked as delivered by ${payload.data.customerName}`,
          action: {
            label: "View Order",
            onClick: () => {
              router.push(`/point-of-sales/orders/${payload.data.orderId}`);
            },
          },
        });
      }

      // Customer cancelled → notify merchant
      if (
        payload.event === "orders.cancelled" &&
        payload.data.organizationId === activeStore?.id &&
        payload.data.cancelledBy === "customer"
      ) {
        const cancelledNotification: OrderNotification = {
          id: crypto.randomUUID(),
          organizationId: payload.data.organizationId,
          orderId: payload.data.orderId,
          type: "order_cancelled",
          orderNumber: payload.data.orderNumber,
          customerName: payload.data.customerName,
          customerEmail: null,
          storeName: null,
          total: null,
          itemCount: null,
          createdAt: new Date(payload.data.cancelledAt),
          read: false,
        };

        setNotifications(prev => [cancelledNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        toast.error("Order Cancelled", {
          description: `Order #${payload.data.orderNumber} was cancelled by ${payload.data.customerName}`,
          action: {
            label: "View Order",
            onClick: () => {
              router.push(`/point-of-sales/orders/${payload.data.orderId}`);
            },
          },
        });
      }
    },
  });

  // Listen for order status updates (customer)
  useRealtime({
    channels: userId ? [`user:${userId}`] : [],
    events: [
      "orders.confirmed",
      "orders.preparing",
      "orders.ready",
      "orders.delivered",
      "orders.cancelled",
    ],
    onData: payload => {
      if (payload.event === "orders.confirmed") {
        const confirmedNotification: OrderNotification = {
          id: crypto.randomUUID(),
          organizationId: null,
          orderId: payload.data.orderId,
          type: "order_confirmed",
          orderNumber: payload.data.orderNumber,
          customerName: null,
          customerEmail: null,
          storeName: payload.data.storeName,
          total: payload.data.total,
          itemCount: payload.data.itemCount,
          createdAt: new Date(payload.data.confirmedAt),
          read: false,
        };

        setNotifications(prev => [confirmedNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        toast.success("Order Confirmed!", {
          description: `Order #${payload.data.orderNumber} from ${payload.data.storeName} has been confirmed`,
          action: {
            label: "View Order",
            onClick: () => {
              router.push(`/point-of-sales/orders/${payload.data.orderId}`);
            },
          },
        });
      }

      if (payload.event === "orders.preparing") {
        const preparingNotification: OrderNotification = {
          id: crypto.randomUUID(),
          organizationId: null,
          orderId: payload.data.orderId,
          type: "order_preparing",
          orderNumber: payload.data.orderNumber,
          customerName: null,
          customerEmail: null,
          storeName: payload.data.storeName,
          total: null,
          itemCount: null,
          createdAt: new Date(payload.data.preparingAt),
          read: false,
        };

        setNotifications(prev => [preparingNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        toast.info("Order Being Prepared", {
          description: `Order #${payload.data.orderNumber} from ${payload.data.storeName} is being prepared`,
          action: {
            label: "View Order",
            onClick: () => {
              router.push(`/point-of-sales/orders/${payload.data.orderId}`);
            },
          },
        });
      }

      if (payload.event === "orders.ready") {
        const readyNotification: OrderNotification = {
          id: crypto.randomUUID(),
          organizationId: null,
          orderId: payload.data.orderId,
          type: "order_ready",
          orderNumber: payload.data.orderNumber,
          customerName: null,
          customerEmail: null,
          storeName: payload.data.storeName,
          total: null,
          itemCount: null,
          createdAt: new Date(payload.data.readyAt),
          read: false,
        };

        setNotifications(prev => [readyNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        toast.success("Order Ready!", {
          description: `Order #${payload.data.orderNumber} from ${payload.data.storeName} is ready for pickup`,
          action: {
            label: "View Order",
            onClick: () => {
              router.push(`/point-of-sales/orders/${payload.data.orderId}`);
            },
          },
        });
      }

      if (payload.event === "orders.delivered") {
        const deliveredNotification: OrderNotification = {
          id: crypto.randomUUID(),
          organizationId: null,
          orderId: payload.data.orderId,
          type: "order_delivered",
          orderNumber: payload.data.orderNumber,
          customerName: null,
          customerEmail: null,
          storeName: payload.data.storeName,
          total: null,
          itemCount: null,
          createdAt: new Date(payload.data.deliveredAt),
          read: false,
        };

        setNotifications(prev => [deliveredNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        toast.success("Order Delivered!", {
          description: `Order #${payload.data.orderNumber} from ${payload.data.storeName} has been delivered`,
          action: {
            label: "View Order",
            onClick: () => {
              router.push(`/point-of-sales/orders/${payload.data.orderId}`);
            },
          },
        });
      }

      // Merchant cancelled → notify customer
      if (
        payload.event === "orders.cancelled" &&
        payload.data.cancelledBy === "merchant"
      ) {
        const cancelledNotification: OrderNotification = {
          id: crypto.randomUUID(),
          organizationId: null,
          orderId: payload.data.orderId,
          type: "order_cancelled",
          orderNumber: payload.data.orderNumber,
          customerName: null,
          customerEmail: null,
          storeName: payload.data.storeName,
          total: null,
          itemCount: null,
          createdAt: new Date(payload.data.cancelledAt),
          read: false,
        };

        setNotifications(prev => [cancelledNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        toast.error("Order Cancelled", {
          description: `Order #${payload.data.orderNumber} was cancelled by ${payload.data.storeName}`,
          action: {
            label: "View Order",
            onClick: () => {
              router.push(`/point-of-sales/orders/${payload.data.orderId}`);
            },
          },
        });
      }
    },
  });

  // Listen for new followers (user channel)
  useRealtime({
    channels: userId ? [`user:${userId}`] : [],
    events: ["followers.new"],
    onData: payload => {
      if (payload.event === "followers.new") {
        const followerNotification: FollowerNotification = {
          id: payload.data.notificationId,
          type: "new_follower",
          followerId: payload.data.followerId,
          followerName: payload.data.followerName,
          followerImage: payload.data.followerImage,
          targetId: payload.data.targetId,
          targetType: payload.data.targetType,
          targetName: payload.data.targetName,
          createdAt: new Date(payload.data.createdAt),
          read: false,
        };

        setNotifications(prev => [followerNotification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        toast.success("New Follower!", {
          description:
            payload.data.targetType === "organization"
              ? `${payload.data.followerName} started following ${payload.data.targetName}`
              : `${payload.data.followerName} started following you`,
          action: {
            label: "View",
            onClick: () => {
              router.push(`/users/${payload.data.followerId}`);
            },
          },
        });
      }
    },
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "new":
        return <Package className="size-4 text-orange-500" />;
      case "status_update":
        return <Clock className="size-4 text-blue-500" />;
      case "order_confirmed":
        return <CheckCircle className="size-4 text-green-500" />;
      case "order_preparing":
        return <ChefHat className="size-4 text-yellow-500" />;
      case "order_ready":
        return <PackageCheck className="size-4 text-blue-500" />;
      case "order_delivered":
        return <Truck className="size-4 text-green-600" />;
      case "order_paid":
        return <Banknote className="size-4 text-green-600" />;
      case "order_cancelled":
        return <XCircle className="size-4 text-red-500" />;
      case "new_follower":
        return <UserPlus className="size-4 text-primary" />;
      default:
        return <Package className="size-4 text-orange-500" />;
    }
  };

  const getNotificationTitle = (type: NotificationType) => {
    switch (type) {
      case "new":
        return "New Order";
      case "status_update":
        return "Order Update";
      case "order_confirmed":
        return "Order Confirmed";
      case "order_preparing":
        return "Order Preparing";
      case "order_ready":
        return "Order Ready";
      case "order_delivered":
        return "Order Delivered";
      case "order_paid":
        return "Order Paid";
      case "order_cancelled":
        return "Order Cancelled";
      case "new_follower":
        return "New Follower";
      default:
        return "Notification";
    }
  };

  const isOrderNotification = (n: Notification): n is OrderNotification =>
    n.type !== "new_follower";

  const isFollowerNotification = (n: Notification): n is FollowerNotification =>
    n.type === "new_follower";

  const getNotificationHref = (notification: Notification): string => {
    if (isFollowerNotification(notification)) {
      return `/users/${notification.followerId}`;
    }
    return `/point-of-sales/orders/${notification.orderId}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative border-none shadow-none bg-transparent hover:bg-muted"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 size-4 flex items-center justify-center text-xs"
              title="Notifications count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="text-xs"
            >
              Clear all
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Package className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm tracking-tighter font-mono">
              No new notifications
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map(notification => (
              <DropdownMenuItem
                key={notification.id}
                className="p-3 cursor-pointer focus:bg-accent"
                asChild
              >
                <Link
                  href={getNotificationHref(notification) as Route}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          {getNotificationTitle(notification.type)}
                        </p>
                        {!notification.read && (
                          <div className="size-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {isFollowerNotification(notification) ? (
                          <p className="text-xs text-muted-foreground">
                            {notification.followerName} started following{" "}
                            {notification.targetType === "organization"
                              ? notification.targetName
                              : "you"}
                          </p>
                        ) : (
                          isOrderNotification(notification) && (
                            <>
                              <p className="text-xs text-muted-foreground">
                                Order #{notification.orderNumber}
                              </p>
                              {notification.type === "new" &&
                                notification.customerName && (
                                  <>
                                    <p className="text-xs text-muted-foreground">
                                      from {notification.customerName} |{" "}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {notification.itemCount ?? 0} item
                                      {(notification.itemCount ?? 0) > 1
                                        ? "s"
                                        : ""}{" "}
                                      •{" "}
                                      {notification.total &&
                                        formatPriceInRWF(
                                          Number(notification.total),
                                        )}
                                    </p>
                                  </>
                                )}
                              {(notification.type === "order_confirmed" ||
                                notification.type === "order_preparing" ||
                                notification.type === "order_ready" ||
                                notification.type === "order_delivered") &&
                                notification.storeName && (
                                  <p className="text-xs text-muted-foreground">
                                    from {notification.storeName}
                                  </p>
                                )}
                            </>
                          )
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
